import { v4 as uuid } from 'uuid';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { EventBus } from './event-bus.js';
import type { OrchestratorState } from './event-bus.js';
import { OrchestratorStateMachine } from './state-machine.js';
import { TaskQueue } from './task-queue.js';
import type { Plan } from '../planning/types.js';
import type { Context, ExecutionResult, VerificationResult } from '../planning/types.js';
import { Planner } from '../planning/planner.js';
import { PlanExecutor } from '../planning/executor.js';
import { Verifier } from '../verification/verifier.js';
import type { CodeIndexer, CodeChunkResult } from '../indexing/code-indexer.js';
import type { ConversationStore } from '../memory/conversation-store.js';
import type { KnowledgeBase } from '../memory/knowledge-base.js';
import { ContextWindowManager } from '../memory/context-window.js';
import type { LLMProvider } from '../llm/provider.js';
import { isGitRepo } from '../git/git-utils.js';
import { WorktreeManager } from '../git/worktree-manager.js';

const TREE_EXCLUDED = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit',
  'dist', 'build', '.cache', '.turbo', '.output', '__pycache__',
  'coverage', '.vercel', '.netlify',
]);

async function buildProjectTree(
  dir: string,
  prefix: string,
  depth: number,
  maxDepth: number
): Promise<string[]> {
  if (depth >= maxDepth) return [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  const lines: string[] = [];
  for (const e of entries) {
    if (TREE_EXCLUDED.has(e.name)) continue;
    if (e.name.startsWith('.') && e.name !== '.env.example') continue;
    const connector = '├── ';
    if (e.isDirectory()) {
      lines.push(`${prefix}${connector}${e.name}/`);
      const children = await buildProjectTree(
        join(dir, e.name), prefix + '│   ', depth + 1, maxDepth
      );
      lines.push(...children);
    } else {
      lines.push(`${prefix}${connector}${e.name}`);
    }
  }
  return lines;
}

export type { LLMProvider };

export interface ToolDefinitionInfo {
  name: string;
  description: string;
  parameters: Array<{ name: string; type: string; description?: string; required?: boolean }>;
  category: string;
}

export interface ToolRegistry {
  execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
  has(toolName: string): boolean;
  list?(): ToolDefinitionInfo[];
  allKnownNames?(): string[];
  setProjectPath?(path: string): void;
  getProjectPath?(): string;
}

export interface OrchestratorOptions {
  toolRegistry: ToolRegistry;
  llmProvider: LLMProvider;
  projectPath?: string;
  codeIndexer?: CodeIndexer;
  conversationStore?: ConversationStore;
  knowledgeBase?: KnowledgeBase;
  sessionId?: string;
  maxContextTokens?: number;
}

export class Orchestrator {
  readonly events = new EventBus();
  readonly stateMachine = new OrchestratorStateMachine();
  readonly taskQueue = new TaskQueue();

  state: OrchestratorState = 'idle';
  currentTask: string | null = null;
  currentPlan: Plan | null = null;
  toolRegistry: ToolRegistry;
  llmProvider: LLMProvider;
  projectPath?: string;

  private planner: Planner;
  private executor: PlanExecutor;
  private verifier: Verifier;
  private abortController: AbortController | null = null;
  private codeIndexer?: CodeIndexer;
  private conversationStore?: ConversationStore;
  private knowledgeBase?: KnowledgeBase;
  private contextWindowManager: ContextWindowManager;
  private sessionId: string;
  private worktreeManager?: WorktreeManager;
  private activeWorktreeTaskId: string | null = null;

  constructor(options: OrchestratorOptions) {
    this.toolRegistry = options.toolRegistry;
    this.llmProvider = options.llmProvider;
    this.projectPath = options.projectPath;
    const toolDefs = options.toolRegistry.list?.() ?? [];
    const knownNames = options.toolRegistry.allKnownNames?.() ?? toolDefs.map((t) => t.name);
    this.planner = new Planner(options.llmProvider, toolDefs, new Set(knownNames));
    this.executor = new PlanExecutor(options.toolRegistry, this.events, options.projectPath, options.llmProvider);
    this.verifier = new Verifier(options.projectPath ?? '.', options.llmProvider, this.events);
    this.codeIndexer = options.codeIndexer;
    this.conversationStore = options.conversationStore;
    this.knowledgeBase = options.knowledgeBase;
    this.contextWindowManager = new ContextWindowManager(options.maxContextTokens);
    this.sessionId = options.sessionId ?? uuid();
  }

  async processRequest(userMessage: string): Promise<void> {
    this.abortController = new AbortController();
    const taskId = uuid();
    this.currentTask = taskId;

    try {
      await this.transitionTo('planning');
      this.events.emitMessage('user', userMessage);

      this.events.emitDebug('info', 'orchestrator', 'Gathering context', { taskId });
      const context = await this.gatherContext({ id: taskId, description: userMessage });
      this.events.emitDebug('info', 'orchestrator', `Context gathered: ${context.files.length} files, ${context.codeSnippets?.length ?? 0} snippets`);

      this.events.emitDebug('info', 'orchestrator', 'Creating plan via LLM');
      const plan = await this.plan({ id: taskId, description: userMessage }, context);
      this.currentPlan = plan;

      this.events.emitPlanCreated(
        plan.id,
        plan.title,
        plan.steps.map((s) => ({
          id: s.id,
          toolName: s.toolName,
          description: s.description,
          dependsOn: s.dependsOn,
        }))
      );
      this.events.emitDebug('info', 'orchestrator', `Plan created: "${plan.title}" with ${plan.steps.length} steps`);

      await this.transitionTo('executing');

      let worktreePath: string | undefined;
      const useWorktree = this.projectPath && await isGitRepo(this.projectPath).catch(() => false);
      if (useWorktree && this.projectPath) {
        try {
          this.worktreeManager = new WorktreeManager(this.projectPath);
          worktreePath = await this.worktreeManager.createWorktree(taskId);
          this.activeWorktreeTaskId = taskId;
          this.toolRegistry.setProjectPath?.(worktreePath);
          this.executor.setProjectPath(worktreePath);
          this.executor.setWorktreeMode(true);
          this.events.emitDebug('info', 'orchestrator', `Created worktree at ${worktreePath}`);
        } catch (wtErr) {
          this.events.emitDebug('warn', 'orchestrator',
            `Worktree creation failed, falling back to in-place editing: ${wtErr instanceof Error ? wtErr.message : String(wtErr)}`);
          worktreePath = undefined;
          this.activeWorktreeTaskId = null;
        }
      }

      let results = await this.execute(plan);

      if (worktreePath && this.worktreeManager && this.projectPath) {
        this.toolRegistry.setProjectPath?.(this.projectPath);
        this.executor.setProjectPath(this.projectPath);
        this.executor.setWorktreeMode(false);

        try {
          const diff = await this.worktreeManager.getDiff(taskId);
          if (diff.files.length > 0) {
            this.events.emitWorktreeDiff(taskId, diff.branch, diff.files);
          }
        } catch (diffErr) {
          this.events.emitDebug('warn', 'orchestrator',
            `Failed to compute worktree diff: ${diffErr instanceof Error ? diffErr.message : String(diffErr)}`);
        }
      }

      if (plan.status === 'infeasible') {
        const reason = plan.infeasibleReason
          ?? 'The requested target could not be found in the codebase.';
        this.events.emitMessage('assistant',
          `**Could not complete: ${plan.title}**\n\n${reason}\n\nPlease check that the target exists in this project, or provide more details so I can locate it.`
        );
        await this.transitionTo('error');
        this.events.emitError(reason);
        return;
      }

      if (plan.steps.length > 0 && results.length === 0) {
        this.events.emitMessage('assistant', `**${plan.title}**\n\nNo steps were executed. The plan had ${plan.steps.length} step(s) but none could be run.`);
        await this.transitionTo('error');
        this.events.emitError(`No steps were executed out of ${plan.steps.length} planned step(s)`);
        return;
      }

      const allStepsFailed = results.length > 0 && results.every((r) => !r.success);
      if (allStepsFailed) {
        const summary = this.buildCompletionSummary(plan, results);
        this.events.emitMessage('assistant', summary);
        await this.transitionTo('error');
        const failedDescriptions = results.map((r) => {
          const step = plan.steps.find((s) => s.id === r.stepId);
          return `${step?.toolName ?? r.stepId}: ${r.error ?? 'unknown error'}`;
        });
        this.events.emitError(`All ${results.length} step(s) failed:\n${failedDescriptions.join('\n')}`);
        return;
      }

      await this.transitionTo('verifying');
      this.events.emitDebug('info', 'orchestrator', 'Starting verification phase');
      const verification = await this.verify(results, plan);

      if (!verification.passed && verification.canRetry) {
        this.events.emitDebug('info', 'orchestrator', 'Re-planning based on failure context');
        await this.transitionTo('planning');
        const retryContext = await this.gatherContext({ id: taskId, description: userMessage });
        const retryPlan = await this.planner.replan(userMessage, retryContext, plan, results);
        this.currentPlan = retryPlan;

        if (retryPlan.status === 'infeasible') {
          const reason = retryPlan.infeasibleReason
            ?? 'After searching, the requested target does not appear to exist in this codebase.';
          this.events.emitMessage('assistant',
            `**Could not complete: ${retryPlan.title}**\n\n${reason}\n\nPlease check that the target exists in this project, or provide more details so I can locate it.`
          );
          await this.transitionTo('error');
          this.events.emitError(reason);
          return;
        }

        this.events.emitPlanCreated(
          retryPlan.id,
          retryPlan.title,
          retryPlan.steps.map((s) => ({
            id: s.id,
            toolName: s.toolName,
            description: s.description,
            dependsOn: s.dependsOn,
          }))
        );
        this.events.emitDebug('info', 'orchestrator', `Retry plan: "${retryPlan.title}" with ${retryPlan.steps.length} steps`);
        await this.transitionTo('executing');
        const retryResults = await this.execute(retryPlan);
        await this.transitionTo('verifying');
        const retryVerification = await this.verify(retryResults, retryPlan);
        if (!retryVerification.passed) {
          await this.transitionTo('error');
          this.events.emitError(retryVerification.issues.join('; '));
          return;
        }
        results = retryResults;
      } else if (!verification.passed) {
        await this.transitionTo('error');
        this.events.emitError(verification.issues.join('; '));
        return;
      }

      const allStepsSucceeded = results.length > 0 && results.every((r) => r.success);
      const summary = this.buildCompletionSummary(plan, results);
      this.events.emitMessage('assistant', summary);

      await this.transitionTo('complete');
      this.events.emitComplete(allStepsSucceeded, results);
    } catch (err) {
      if (this.stateMachine.canTransition('error')) {
        await this.transitionTo('error');
      } else {
        const prev = this.stateMachine.getState();
        this.stateMachine.reset();
        this.state = 'idle';
        this.events.emitStateChange(prev, 'idle');
      }
      const message = err instanceof Error ? err.message : String(err);
      this.events.emitError(message, undefined, err instanceof Error ? err.stack : undefined);
    } finally {
      if (this.projectPath) {
        this.toolRegistry.setProjectPath?.(this.projectPath);
        this.executor.setProjectPath(this.projectPath);
        this.executor.setWorktreeMode(false);
      }
      this.currentTask = null;
      this.currentPlan = null;
      this.abortController = null;
      if (this.stateMachine.getState() !== 'idle') {
        const prev = this.stateMachine.getState();
        this.stateMachine.reset();
        this.state = 'idle';
        this.events.emitStateChange(prev, 'idle');
      }
    }
  }

  async gatherContext(task: { id: string; description: string }): Promise<Context> {
    const tokenBudget = this.contextWindowManager;
    const maxCodeChunks = 15;
    const maxHistoryMessages = 20;

    let codeChunks: CodeChunkResult[] = [];
    if (this.codeIndexer) {
      try {
        codeChunks = await this.codeIndexer.semanticSearch(task.description, maxCodeChunks);
      } catch { /* indexer unavailable */ }
    }

    const relevantFiles = [...new Set(codeChunks.map((c) => c.filePath))];

    let conversationSummary = '';
    const memoryItems: unknown[] = [];
    if (this.conversationStore) {
      try {
        const history = await this.conversationStore.getHistory(this.sessionId, maxHistoryMessages);
        memoryItems.push(...history);
        if (history.length > 0) {
          conversationSummary = history
            .slice(-5)
            .map((m) => `[${m.role}]: ${m.content.slice(0, 200)}`)
            .join('\n');
        }
      } catch { /* store unavailable */ }
    }

    let projectInstructions = '';
    const knowledgeItems: unknown[] = [];
    if (this.knowledgeBase) {
      try {
        if (this.projectPath) {
          const instructions = await this.knowledgeBase.loadProjectInstructions(this.projectPath);
          if (instructions) {
            projectInstructions = instructions;
            knowledgeItems.push({ type: 'project-instructions', content: instructions });
          }
        }

        const rules = await this.knowledgeBase.getRules();
        const enabledRules = rules.filter((r) => r.enabled);
        if (enabledRules.length > 0) {
          knowledgeItems.push(...enabledRules);
          projectInstructions += '\n\n' + enabledRules.map((r) => `[${r.category}] ${r.title}: ${r.content}`).join('\n');
          projectInstructions = projectInstructions.trim();
        }
      } catch { /* knowledge base unavailable */ }
    }

    const codeSnippets = codeChunks.map((c) => ({
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
      content: c.content,
      score: c.score,
      symbolName: c.symbolName,
      symbolType: c.symbolType,
    }));

    let projectStructure = '';
    if (this.projectPath) {
      try {
        const treeLines = await buildProjectTree(this.projectPath, '', 0, 3);
        projectStructure = treeLines.join('\n');
      } catch { /* tree scan unavailable */ }
    }

    const knowledgeStrings = projectInstructions ? [projectInstructions] : [];
    tokenBudget.buildContext(
      task.description,
      (memoryItems as Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>),
      knowledgeStrings,
      codeChunks
    );

    return {
      files: relevantFiles,
      memory: memoryItems,
      knowledge: knowledgeItems,
      projectPath: this.projectPath,
      relevantFiles,
      conversationSummary,
      projectInstructions,
      codeSnippets,
      projectStructure,
    };
  }

  async plan(
    task: { id: string; description: string },
    context: Context
  ): Promise<Plan> {
    return this.planner.createPlan(task.description, context);
  }

  async execute(plan: Plan): Promise<ExecutionResult[]> {
    return this.executor.executePlan(plan, this.abortController?.signal);
  }

  async verify(
    results: ExecutionResult[],
    plan: Plan
  ): Promise<VerificationResult> {
    return this.verifier.verify(results, plan);
  }

  abort(): void {
    this.abortController?.abort();
  }

  async acceptWorktreeChanges(taskId: string): Promise<void> {
    if (!this.worktreeManager) throw new Error('No worktree manager available');
    await this.worktreeManager.acceptChanges(taskId);
    this.activeWorktreeTaskId = null;
    this.events.emitWorktreeAccepted(taskId);
    this.events.emitDebug('info', 'orchestrator', `Worktree changes accepted for task ${taskId}`);
  }

  async rejectWorktreeChanges(taskId: string): Promise<void> {
    if (!this.worktreeManager) throw new Error('No worktree manager available');
    await this.worktreeManager.rejectChanges(taskId);
    this.activeWorktreeTaskId = null;
    this.events.emitWorktreeRejected(taskId);
    this.events.emitDebug('info', 'orchestrator', `Worktree changes rejected for task ${taskId}`);
  }

  getActiveWorktreeTaskId(): string | null {
    return this.activeWorktreeTaskId;
  }

  private buildCompletionSummary(plan: Plan, results: ExecutionResult[]): string {
    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const modifiedFiles: string[] = [];
    for (const r of results) {
      if (!r.success) continue;
      const step = plan.steps.find((s) => s.id === r.stepId);
      if (!step) continue;
      if (['file_edit', 'file_write', 'edit', 'write'].includes(step.toolName)) {
        const filePath = (step.toolArgs['path'] ?? step.toolArgs['file']) as string | undefined;
        if (filePath && !modifiedFiles.includes(filePath)) {
          modifiedFiles.push(filePath);
        }
      }
    }

    const lines: string[] = [];
    lines.push(`**${plan.title}**`);
    lines.push('');

    if (succeeded.length > 0) {
      lines.push(`Completed ${succeeded.length} step${succeeded.length !== 1 ? 's' : ''} successfully.`);
    }
    if (failed.length > 0) {
      lines.push(`${failed.length} step${failed.length !== 1 ? 's' : ''} failed.`);
    }

    if (modifiedFiles.length > 0) {
      lines.push('');
      lines.push(`Modified ${modifiedFiles.length} file${modifiedFiles.length !== 1 ? 's' : ''}:`);
      for (const f of modifiedFiles) {
        lines.push(`- \`${f}\``);
      }
    }

    if (failed.length > 0) {
      lines.push('');
      lines.push('Errors:');
      for (const r of failed) {
        const step = plan.steps.find((s) => s.id === r.stepId);
        lines.push(`- ${step?.description ?? r.stepId}: ${r.error}`);
      }
    }

    return lines.join('\n');
  }

  private async transitionTo(to: OrchestratorState): Promise<void> {
    const from = this.stateMachine.getState();
    this.stateMachine.transition(from, to);
    this.state = to;
    this.events.emitStateChange(from, to);
  }
}
