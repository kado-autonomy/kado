import { v4 as uuid } from 'uuid';
import type {
  AgentType,
  SubagentResult,
  SubagentStatus,
} from './types.js';
import type { TOONMessage } from '../toon/protocol.js';

export interface ContextPool {
  add(key: string, value: unknown): void;
  get<T>(key: string): T | undefined;
  clear(): void;
}

export interface SubagentLLMProvider {
  complete(prompt: string, options?: { maxTokens?: number }): Promise<string>;
}

export interface SubagentToolRegistry {
  execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
  has(toolName: string): boolean;
}

export interface SubagentOptions {
  type: AgentType;
  llmProvider: SubagentLLMProvider;
  toolRegistry: SubagentToolRegistry;
  contextPool: ContextPool;
  maxTokens?: number;
}

export class Subagent {
  readonly id: string;
  readonly type: AgentType;
  status: SubagentStatus = 'idle';
  currentTask = '';
  progress = 0;
  tokenUsage = 0;
  startedAt = 0;

  private llmProvider: SubagentLLMProvider;
  private _toolRegistry: SubagentToolRegistry;
  private contextPool: ContextPool;
  private maxTokens: number;
  private abortController: AbortController | null = null;
  private messageHandlers: ((msg: TOONMessage) => void)[] = [];

  constructor(options: SubagentOptions) {
    this.id = uuid();
    this.type = options.type;
    this.llmProvider = options.llmProvider;
    this._toolRegistry = options.toolRegistry;
    this.contextPool = options.contextPool;
    this.maxTokens = options.maxTokens ?? 4096;
  }

  async run(task: string): Promise<SubagentResult> {
    this.status = 'running';
    this.currentTask = task;
    this.progress = 0;
    this.startedAt = Date.now();
    this.abortController = new AbortController();
    this.contextPool.clear();

    try {
      const systemPrompt = this.buildSystemPrompt();
      const response = await this.llmProvider.complete(
        `${systemPrompt}\n\nTask: ${task}`,
        { maxTokens: this.maxTokens }
      );
      this.tokenUsage += response.length;
      this.status = 'complete';
      this.progress = 100;
      return {
        success: true,
        output: response,
      };
    } catch (err) {
      this.status = 'error';
      return {
        success: false,
        output: err instanceof Error ? err.message : String(err),
      };
    } finally {
      this.abortController = null;
    }
  }

  async abort(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.status = 'aborted';
  }

  onMessage(handler: (msg: TOONMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  receiveMessage(msg: TOONMessage): void {
    for (const h of this.messageHandlers) h(msg);
  }

  protected emitMessage(msg: TOONMessage): void {
    this.receiveMessage(msg);
  }

  protected buildSystemPrompt(): string {
    return `You are a specialized ${this.type} agent. Complete the given task.`;
  }

  protected getTools(): string[] {
    return [];
  }

  protected get toolRegistry(): SubagentToolRegistry {
    return this._toolRegistry;
  }
}
