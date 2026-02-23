import * as fs from 'fs/promises';
import * as path from 'path';
import type { ToolRegistry } from '../core/orchestrator.js';
import type { EventBus, FileChangePayload } from '../core/event-bus.js';
import type { Plan, PlanStep, ExecutionResult } from './types.js';
import type { LLMProvider } from '../llm/provider.js';
import type { LLMMessage } from '../llm/types.js';
import { RollbackManager } from '../permissions/rollback.js';

const FILE_MODIFYING_TOOLS = new Set(['edit', 'write', 'file_edit', 'file_write']);
const SEARCH_TOOLS = new Set(['grep_search', 'glob_search', 'semantic_search']);

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript', '.jsx': 'javascriptreact',
  '.json': 'json', '.css': 'css', '.scss': 'scss', '.html': 'html', '.md': 'markdown',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java', '.rb': 'ruby',
  '.yml': 'yaml', '.yaml': 'yaml', '.toml': 'toml', '.sh': 'shell', '.sql': 'sql',
  '.xml': 'xml', '.svg': 'xml', '.vue': 'vue', '.svelte': 'svelte',
};

function truncateResult(value: unknown, maxLen = 4000): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '\n... (truncated)';
}

export class PlanExecutor {
  private rollbackManager: RollbackManager | null = null;
  private projectPath: string | undefined;
  private _worktreeMode = false;

  constructor(
    private toolRegistry: ToolRegistry,
    private events: EventBus,
    projectPath?: string,
    private llmProvider?: LLMProvider
  ) {
    this.projectPath = projectPath;
    if (projectPath) {
      this.rollbackManager = new RollbackManager(projectPath);
    }
  }

  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
    if (!this._worktreeMode) {
      this.rollbackManager = new RollbackManager(projectPath);
    }
  }

  setWorktreeMode(enabled: boolean): void {
    this._worktreeMode = enabled;
    if (enabled) {
      this.rollbackManager = null;
    } else if (this.projectPath) {
      this.rollbackManager = new RollbackManager(this.projectPath);
    }
  }

  async executePlan(
    plan: Plan,
    signal?: AbortSignal
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const completed = new Set<string>();
    const stepBackups = new Map<string, string[]>();
    const totalSteps = plan.steps.length;

    const getReadySteps = (): PlanStep[] => {
      return plan.steps.filter(
        (s) =>
          s.status === 'pending' &&
          s.dependsOn.every((dep) => completed.has(dep))
      );
    };

    this.events.emitDebug('info', 'executor', `Executing plan with ${totalSteps} steps`);

    let completedCount = 0;
    let ready = getReadySteps();
    while (ready.length > 0) {
      if (signal?.aborted) break;

      const step = ready[0]!;
      const stepIndex = plan.steps.indexOf(step);
      step.status = 'running';
      this.events.emitProgress(
        step.id,
        Math.round((completedCount / totalSteps) * 100),
        `Step ${stepIndex + 1}/${totalSteps}: ${step.description}`
      );
      this.events.emitToolCall(step.toolName, step.toolArgs);
      this.events.emitDebug('debug', 'executor', `Running step ${stepIndex + 1}: ${step.toolName}`, step.toolArgs);

      const failedDeps = step.dependsOn
        .map((id) => plan.steps.find((s) => s.id === id))
        .filter((s) => s?.status === 'failed');
      if (failedDeps.length > 0 && failedDeps.length === step.dependsOn.length) {
        const duration = 0;
        const reason = `Skipped: all dependencies failed (${failedDeps.map((s) => s!.id).join(', ')})`;
        step.status = 'failed';
        completed.add(step.id);
        completedCount++;
        results.push({ stepId: step.id, success: false, error: reason, duration });
        this.events.emitDebug('warn', 'executor', reason);
        this.events.emitToolResult(step.toolName, false, { error: reason });
        this.events.emitStepComplete(step.id, stepIndex, totalSteps, false, duration, step.toolName, step.description);
        ready = getReadySteps();
        continue;
      }

      let resolvedArgs = step.toolArgs;
      if (step.dependsOn.length > 0 && this.llmProvider) {
        try {
          resolvedArgs = await this.resolveStepArgs(step, plan);
          this.events.emitDebug('trace', 'executor', `Resolved args for step ${step.id}`, resolvedArgs);
        } catch (resolveErr) {
          const duration = 0;
          const reason = resolveErr instanceof Error ? resolveErr.message : String(resolveErr);
          step.status = 'failed';
          completed.add(step.id);
          completedCount++;
          results.push({ stepId: step.id, success: false, error: reason, duration });
          this.events.emitDebug('warn', 'executor', `Arg resolution failed for step ${step.id}: ${reason}`);
          this.events.emitToolResult(step.toolName, false, { error: reason });
          this.events.emitStepComplete(step.id, stepIndex, totalSteps, false, duration, step.toolName, step.description);
          ready = getReadySteps();
          continue;
        }
      }

      const backupIds = await this.backupFilesForStep(step);
      if (backupIds.length > 0) {
        stepBackups.set(step.id, backupIds);
        this.events.emitDebug('trace', 'executor', `Backed up ${backupIds.length} file(s) for step ${step.id}`);
      }

      const start = Date.now();
      try {
        const output = await this.toolRegistry.execute(step.toolName, resolvedArgs);
        const duration = Date.now() - start;
        step.status = 'complete';
        step.result = output;
        completed.add(step.id);
        completedCount++;

        const rollbackSummary = backupIds.length > 0
          ? `Backed up ${backupIds.length} file(s) before execution`
          : undefined;

        const emptyResult = SEARCH_TOOLS.has(step.toolName) && this.isEmptySearchResult(output);
        results.push({
          stepId: step.id,
          success: true,
          output,
          duration,
          emptyResult,
          ...(rollbackSummary ? { rollbackInfo: rollbackSummary } : {}),
        });
        this.events.emitToolResult(step.toolName, true, output);
        this.events.emitStepComplete(step.id, stepIndex, totalSteps, true, duration, step.toolName, step.description);

        if (emptyResult) {
          this.events.emitDebug('warn', 'executor', `Search step ${step.id} returned empty results`);
          if (this.shouldAbortEarly(plan, results)) {
            this.events.emitDebug('warn', 'executor', 'All discovery steps returned empty — aborting plan (target not found)');
            plan.status = 'infeasible';
            for (const remaining of plan.steps) {
              if (remaining.status === 'pending') {
                remaining.status = 'failed';
                results.push({
                  stepId: remaining.id,
                  success: false,
                  error: 'Skipped: discovery steps found no matching files or code in the project',
                  duration: 0,
                });
              }
            }
            return results;
          }
        }

        if (FILE_MODIFYING_TOOLS.has(step.toolName) && !this._worktreeMode) {
          const change = await this.captureFileChange(step, backupIds);
          if (change) {
            this.events.emitFileChanges([change]);
          }
        }
      } catch (err) {
        const duration = Date.now() - start;
        const error = err instanceof Error ? err.message : String(err);
        step.status = 'failed';
        completed.add(step.id);
        completedCount++;

        this.events.emitDebug('error', 'executor', `Step ${step.id} failed: ${error}`, {
          toolName: step.toolName,
          args: step.toolArgs,
          stack: err instanceof Error ? err.stack : undefined,
        });

        const rolledBack = this._worktreeMode ? false : await this.rollbackStep(backupIds);
        const rollbackSummary = this._worktreeMode
          ? undefined
          : rolledBack
            ? `Rolled back ${backupIds.length} file(s) after failure`
            : backupIds.length > 0
              ? 'Rollback attempted but may have failed'
              : undefined;

        results.push({
          stepId: step.id,
          success: false,
          error,
          duration,
          ...(rollbackSummary ? { rollbackInfo: rollbackSummary } : {}),
        });
        this.events.emitToolResult(step.toolName, false, { error });
        this.events.emitStepComplete(step.id, stepIndex, totalSteps, false, duration, step.toolName, step.description);
      }

      ready = getReadySteps();
    }

    plan.status = results.every((r) => r.success) ? 'complete' : 'failed';
    this.events.emitDebug('info', 'executor', `Plan execution finished: ${plan.status}`, {
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
    return results;
  }

  private async resolveStepArgs(
    step: PlanStep,
    plan: Plan
  ): Promise<Record<string, unknown>> {
    const depSteps = step.dependsOn
      .map((id) => plan.steps.find((s) => s.id === id))
      .filter((s): s is PlanStep => s != null);

    const depContext = depSteps
      .map((dep) => {
        const resultSummary =
          dep.status === 'failed'
            ? 'FAILED — this step did not produce results'
            : truncateResult(dep.result);
        return `[${dep.id}] "${dep.description}" (${dep.toolName}):\n${resultSummary}`;
      })
      .join('\n\n');

    const prompt = `You are resolving concrete arguments for a tool call in an automated coding plan.

Step to resolve:
- Description: ${step.description}
- Tool: ${step.toolName}
- Planned arguments: ${JSON.stringify(step.toolArgs, null, 2)}

Results from dependency steps:
${depContext}

Instructions:
- Replace any placeholder values with actual values extracted from the dependency results above.
- If a dependency returned a list (e.g., file paths from a search), pick the most relevant item.
- If a required dependency failed or returned empty results making this step impossible, respond with: {"__skip__": true, "reason": "brief explanation"}
- Output ONLY a valid JSON object with the resolved tool arguments (same keys as the planned arguments, but with concrete values).`;

    const messages: LLMMessage[] = [{ role: 'user', content: prompt }];
    const response = await this.llmProvider!.complete(messages, { maxTokens: 1024 });

    const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
    let resolved: Record<string, unknown>;
    try {
      resolved = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      this.events.emitDebug('warn', 'executor', `Failed to parse resolved args for step ${step.id}, using original args`);
      return step.toolArgs;
    }

    if (resolved['__skip__']) {
      throw new Error(`Skipped: ${String(resolved['reason'] ?? 'dependency results insufficient')}`);
    }

    return resolved;
  }

  private async captureFileChange(
    step: PlanStep,
    backupIds: string[]
  ): Promise<FileChangePayload | null> {
    const filePath = (step.toolArgs['path'] ?? step.toolArgs['file']) as string | undefined;
    if (!filePath) return null;

    try {
      const resolvedPath = this.projectPath
        ? path.resolve(this.projectPath, filePath)
        : path.resolve(filePath);
      const ext = path.extname(resolvedPath).toLowerCase();
      const language = EXT_TO_LANGUAGE[ext] ?? 'plaintext';

      let original = '';
      const hadBackup = backupIds.length > 0 && this.rollbackManager;
      if (hadBackup) {
        try {
          original = await this.rollbackManager!.getBackupContent(backupIds[0]!);
        } catch { /* new file — no backup content */ }
      }

      let modified = '';
      try {
        modified = await fs.readFile(resolvedPath, 'utf-8');
      } catch { /* file was deleted */ }

      const status: FileChangePayload['status'] =
        !hadBackup || original === '' ? 'added' :
        modified === '' ? 'deleted' :
        'modified';

      if (original === modified) return null;

      return { filePath, original, modified, language, status };
    } catch {
      return null;
    }
  }

  private async backupFilesForStep(step: PlanStep): Promise<string[]> {
    if (!this.rollbackManager || !FILE_MODIFYING_TOOLS.has(step.toolName)) {
      return [];
    }

    const filePath = (step.toolArgs['path'] ?? step.toolArgs['file']) as string | undefined;
    if (!filePath) return [];

    try {
      const backupId = await this.rollbackManager.backup(filePath);
      return [backupId];
    } catch {
      return [];
    }
  }

  private isEmptySearchResult(output: unknown): boolean {
    if (output == null) return true;
    if (Array.isArray(output)) return output.length === 0;
    if (typeof output === 'string') {
      const trimmed = output.trim();
      return trimmed === '' || trimmed === '[]' || trimmed === '{}';
    }
    if (typeof output === 'object') {
      const entries = Object.values(output as Record<string, unknown>);
      return entries.length === 0 || entries.every((v) => {
        if (Array.isArray(v)) return v.length === 0;
        if (typeof v === 'string') return v.trim() === '';
        return v == null;
      });
    }
    return false;
  }

  private shouldAbortEarly(plan: Plan, results: ExecutionResult[]): boolean {
    const discoverySteps = plan.steps.filter(
      (s) => s.dependsOn.length === 0 && SEARCH_TOOLS.has(s.toolName)
    );
    if (discoverySteps.length === 0) return false;

    const allDiscoveryDone = discoverySteps.every(
      (s) => s.status === 'complete' || s.status === 'failed'
    );
    if (!allDiscoveryDone) return false;

    const allEmpty = discoverySteps.every((s) => {
      if (s.status === 'failed') return true;
      const result = results.find((r) => r.stepId === s.id);
      return result?.emptyResult === true;
    });

    return allEmpty;
  }

  private async rollbackStep(backupIds: string[]): Promise<boolean> {
    if (!this.rollbackManager || backupIds.length === 0) return false;

    try {
      for (const id of backupIds) {
        await this.rollbackManager.rollback(id);
      }
      return true;
    } catch {
      return false;
    }
  }
}
