import { mkdir, readdir, readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { LLMProvider } from '../llm/provider.js';
import type { VectorBridge } from './vector-bridge.js';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  id: string;
  title: string;
  messageCount: number;
  lastActivity: number;
  summary?: string;
}

export interface MemorySearchResult {
  id: string;
  sessionId: string;
  content: string;
  score: number;
  role: string;
  timestamp: number;
}

const CONV_PREFIX = 'conv:';

export class ConversationStore {
  constructor(
    private storagePath: string,
    private vectorBridge: VectorBridge,
    private llmProvider?: LLMProvider
  ) {}

  private sessionPath(sessionId: string): string {
    return join(this.storagePath, `${sessionId}.json`);
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
  }

  async saveMessage(
    sessionId: string,
    message: Partial<ConversationMessage> & Pick<ConversationMessage, 'role' | 'content'>
  ): Promise<void> {
    await this.ensureDir();
    const full: ConversationMessage = {
      id: message.id ?? randomUUID(),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp ?? Date.now(),
      metadata: message.metadata,
    };
    const path = this.sessionPath(sessionId);
    let messages: ConversationMessage[] = [];
    try {
      const data = await readFile(path, 'utf-8');
      messages = JSON.parse(data) as ConversationMessage[];
    } catch {
      messages = [];
    }
    messages.push(full);
    await writeFile(path, JSON.stringify(messages, null, 2));

    const vectorId = `${CONV_PREFIX}${sessionId}:${full.id}`;
    await this.vectorBridge.upsert(vectorId, full.content, {
      sessionId,
      messageId: full.id,
      role: full.role,
      timestamp: full.timestamp,
      text: full.content,
    });
  }

  async getHistory(
    sessionId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    const path = this.sessionPath(sessionId);
    try {
      const data = await readFile(path, 'utf-8');
      const messages = JSON.parse(data) as ConversationMessage[];
      if (limit !== undefined) {
        return messages.slice(-limit);
      }
      return messages;
    } catch {
      return [];
    }
  }

  async summarize(
    sessionId: string,
    messageRange: [number, number]
  ): Promise<string> {
    if (!this.llmProvider) {
      throw new Error('LLM provider required for summarization');
    }
    const messages = await this.getHistory(sessionId);
    const [start, end] = messageRange;
    const slice = messages.slice(start, end + 1);
    if (slice.length === 0) return '';
    const text = slice
      .map((m) => `[${m.role}]: ${m.content}`)
      .join('\n\n');
    const response = await this.llmProvider.complete(
      [
        {
          role: 'system',
          content: 'Summarize the following conversation concisely, preserving key decisions and context.',
        },
        { role: 'user', content: text },
      ],
      { maxTokens: 500 }
    );
    return response.content;
  }

  async searchMemory(
    query: string,
    sessionId?: string,
    topK = 10
  ): Promise<MemorySearchResult[]> {
    const results = await this.vectorBridge.query(query, topK * 2);
    const filtered = results.filter((r) => r.id.startsWith(CONV_PREFIX));
    const mapped: MemorySearchResult[] = [];
    for (const r of filtered) {
      const meta = r.metadata as Record<string, unknown>;
      const sid = meta.sessionId as string | undefined;
      if (sessionId !== undefined && sid !== sessionId) continue;
      mapped.push({
        id: (meta.messageId as string) ?? r.id,
        sessionId: sid ?? '',
        content: r.text,
        score: r.score,
        role: (meta.role as string) ?? 'user',
        timestamp: (meta.timestamp as number) ?? 0,
      });
      if (mapped.length >= topK) break;
    }
    return mapped;
  }

  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureDir();
    const files = await readdir(this.storagePath);
    const sessions: SessionInfo[] = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const sessionId = f.slice(0, -5);
      const path = this.sessionPath(sessionId);
      const data = await readFile(path, 'utf-8');
      const messages = JSON.parse(data) as ConversationMessage[];
      const last = messages[messages.length - 1];
      const title =
        last?.content?.slice(0, 50)?.replace(/\n/g, ' ') ?? 'Untitled';
      sessions.push({
        id: sessionId,
        title,
        messageCount: messages.length,
        lastActivity: last?.timestamp ?? 0,
      });
    }
    return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const messages = await this.getHistory(sessionId);
    for (const m of messages) {
      const vectorId = `${CONV_PREFIX}${sessionId}:${m.id}`;
      await this.vectorBridge.delete(vectorId);
    }
    const path = this.sessionPath(sessionId);
    await unlink(path).catch(() => {});
  }
}
