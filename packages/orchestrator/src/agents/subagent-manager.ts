import { EventEmitter } from 'eventemitter3';
import type { Orchestrator } from '../core/orchestrator.js';
import { Subagent } from './subagent.js';
import type { SubagentOptions } from './subagent.js';
import type {
  SubagentConfig,
  SubagentInfo,
  AgentType,
} from './types.js';
import type { TOONMessage } from '../toon/protocol.js';
import { CodeReviewAgent } from './specialists/code-review-agent.js';
import { TestWriterAgent } from './specialists/test-writer-agent.js';
import { DocumentationAgent } from './specialists/documentation-agent.js';
import { RefactorAgent } from './specialists/refactor-agent.js';
import { ResearchAgent } from './specialists/research-agent.js';

const DEFAULT_MAX_CONCURRENT = 4;

export interface SubagentManagerEvents {
  spawn: (agent: Subagent) => void;
  complete: (agentId: string, result: unknown) => void;
  error: (agentId: string, error: Error) => void;
  message: (agentId: string, msg: TOONMessage) => void;
}

export class SubagentManager extends EventEmitter<SubagentManagerEvents> {
  private orchestrator: Orchestrator;
  private agents = new Map<string, Subagent>();
  private messageHandlers = new Map<string, (msg: TOONMessage) => void>();
  private maxConcurrent: number;

  constructor(orchestrator: Orchestrator, maxConcurrent = DEFAULT_MAX_CONCURRENT) {
    super();
    this.orchestrator = orchestrator;
    this.maxConcurrent = maxConcurrent;
  }

  async spawn(config: SubagentConfig): Promise<Subagent> {
    if (this.agents.size >= this.maxConcurrent) {
      throw new Error(
        `Max concurrent subagents (${this.maxConcurrent}) reached`
      );
    }

    const agent = this.createSubagent(config);
    this.agents.set(agent.id, agent);

    const handler = (msg: TOONMessage) => {
      this.emit('message', agent.id, msg);
    };
    agent.onMessage(handler);
    this.messageHandlers.set(agent.id, handler);

    this.emit('spawn', agent);
    return agent;
  }

  async kill(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.abort();
      this.messageHandlers.delete(agentId);
      this.agents.delete(agentId);
    }
  }

  getAgent(agentId: string): Subagent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): SubagentInfo[] {
    return Array.from(this.agents.values()).map((a) => ({
      id: a.id,
      type: a.type,
      status: a.status,
      currentTask: a.currentTask,
      progress: a.progress,
      startedAt: a.startedAt,
      tokenUsage: a.tokenUsage,
    }));
  }

  async sendMessage(agentId: string, message: TOONMessage): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    agent.receiveMessage(message);
  }

  onMessage(agentId: string, handler: (msg: TOONMessage) => void): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    agent.onMessage(handler);
  }

  private createSubagent(config: SubagentConfig): Subagent {
    const contextPool = this.createContextPool();
    const toolRegistry = this.createToolRegistry(config.tools);
    const llmProvider = {
      complete: async (prompt: string, opts?: { maxTokens?: number }): Promise<string> => {
        const response = await this.orchestrator.llmProvider.complete(
          [{ role: 'user' as const, content: prompt }],
          { maxTokens: opts?.maxTokens ?? config.maxTokens ?? 4096 },
        );
        return response.content;
      },
    };

    const agentMap: Record<AgentType, new (opts: SubagentOptions) => Subagent> = {
      'code-review': CodeReviewAgent,
      'test-writer': TestWriterAgent,
      documentation: DocumentationAgent,
      refactor: RefactorAgent,
      research: ResearchAgent,
    };

    const AgentClass = agentMap[config.type];
    return new AgentClass({
      type: config.type,
      llmProvider,
      toolRegistry,
      contextPool,
      maxTokens: config.maxTokens,
    });
  }

  private createContextPool(): { add: (k: string, v: unknown) => void; get: <T>(k: string) => T | undefined; clear: () => void } {
    const store = new Map<string, unknown>();
    return {
      add: (k, v) => store.set(k, v),
      get: <T>(k: string) => store.get(k) as T | undefined,
      clear: () => store.clear(),
    };
  }

  private createToolRegistry(allowedTools?: string[]) {
    const registry = this.orchestrator.toolRegistry;
    return {
      execute: (name: string, args: Record<string, unknown>) => {
        if (allowedTools && !allowedTools.includes(name)) {
          throw new Error(`Tool ${name} not allowed for this subagent`);
        }
        return registry.execute(name, args);
      },
      has: (name: string) => {
        if (allowedTools && !allowedTools.includes(name)) return false;
        return registry.has(name);
      },
    };
  }
}
