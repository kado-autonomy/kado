import { randomUUID } from 'crypto';
import type { LLMMessage } from '../llm/types.js';
import type { CodeChunkResult } from '../indexing/code-indexer.js';
import { estimateTokens } from './context-window.js';

export interface AgentContext {
  agentId: string;
  messages: LLMMessage[];
  codeChunks: CodeChunkResult[];
  knowledge: string[];
  tokenCount: number;
  createdAt: number;
}

export interface PoolInfo {
  agentId: string;
  size: number;
  createdAt: number;
}

export class ContextPool {
  private pools = new Map<string, AgentContext>();

  createPool(agentId?: string): AgentContext {
    const id = agentId ?? randomUUID();
    if (this.pools.has(id)) {
      throw new Error(`Pool already exists for agent ${id}`);
    }
    const ctx: AgentContext = {
      agentId: id,
      messages: [],
      codeChunks: [],
      knowledge: [],
      tokenCount: 0,
      createdAt: Date.now(),
    };
    this.pools.set(id, ctx);
    return ctx;
  }

  getPool(agentId: string): AgentContext | undefined {
    return this.pools.get(agentId);
  }

  destroyPool(agentId: string): void {
    this.pools.delete(agentId);
  }

  listPools(): PoolInfo[] {
    return Array.from(this.pools.entries()).map(([agentId, ctx]) => ({
      agentId,
      size: this.getPoolSize(agentId),
      createdAt: ctx.createdAt,
    }));
  }

  getPoolSize(agentId: string): number {
    const ctx = this.pools.get(agentId);
    if (!ctx) return 0;
    const messageTokens = ctx.messages.reduce(
      (acc, m) => acc + estimateTokens(m.content) + 10,
      0
    );
    const codeTokens = ctx.codeChunks.reduce(
      (acc, c) => acc + estimateTokens(c.content) + 20,
      0
    );
    const knowledgeTokens = ctx.knowledge.reduce(
      (acc, k) => acc + estimateTokens(k),
      0
    );
    return messageTokens + codeTokens + knowledgeTokens;
  }
}
