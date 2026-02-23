import type { LLMMessage } from '../llm/types.js';
import type { CodeChunkResult } from '../indexing/code-indexer.js';
import type { ConversationMessage } from './conversation-store.js';

export interface ContextPayload {
  messages: LLMMessage[];
  tokenCount: number;
  truncated: boolean;
}

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export class ContextWindowManager {
  constructor(private maxTokens = 100_000) {}

  buildContext(
    request: string,
    history: ConversationMessage[],
    knowledge: string[],
    codeChunks: CodeChunkResult[]
  ): ContextPayload {
    const messages: LLMMessage[] = [];
    let used = 0;
    const budget = this.maxTokens;

    const systemParts: string[] = [];
    const systemOverhead = 100;
    if (knowledge.length > 0) {
      const knowledgeText = knowledge.join('\n\n');
      const knowledgeTokens = estimateTokens(knowledgeText);
      if (knowledgeTokens + systemOverhead < budget * 0.2) {
        systemParts.push('## Project Knowledge\n\n' + knowledgeText);
        used += knowledgeTokens + systemOverhead;
      }
    }

    const recentHistory = history.slice(-10);
    const historyTokens = recentHistory.reduce(
      (acc, m) => acc + estimateTokens(m.content) + 10,
      0
    );
    const codeText = codeChunks
      .map(
        (c) =>
          `### ${c.filePath}:${c.startLine}-${c.endLine}\n\`\`\`\n${c.content}\n\`\`\``
      )
      .join('\n\n');
    const codeTokens = estimateTokens(codeText);
    const requestTokens = estimateTokens(request) + 20;

    const remaining = budget - systemOverhead - requestTokens;
    let historyBudget = Math.floor(remaining * 0.4);
    let codeBudget = Math.floor(remaining * 0.4);

    if (historyTokens <= historyBudget && codeTokens <= codeBudget) {
      historyBudget = historyTokens;
      codeBudget = codeTokens;
    } else if (historyTokens > historyBudget && codeTokens <= codeBudget) {
      codeBudget = codeTokens;
    } else if (historyTokens <= historyBudget && codeTokens > codeBudget) {
      historyBudget = historyTokens;
    }

    let historyUsed = 0;
    const historyMessages: LLMMessage[] = [];
    for (let i = recentHistory.length - 1; i >= 0 && historyUsed < historyBudget; i--) {
      const m = recentHistory[i];
      if (m === undefined) break;
      const tokens = estimateTokens(m.content) + 10;
      if (historyUsed + tokens > historyBudget) break;
      historyUsed += tokens;
      historyMessages.unshift({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      });
    }

    let codeUsed = 0;
    let codeBlock = '';
    for (const c of codeChunks) {
      const chunkText = `### ${c.filePath}:${c.startLine}-${c.endLine}\n\`\`\`\n${c.content}\n\`\`\`\n`;
      const tokens = estimateTokens(chunkText);
      if (codeUsed + tokens > codeBudget) break;
      codeUsed += tokens;
      codeBlock += chunkText;
    }

    if (systemParts.length > 0) {
      messages.push({
        role: 'system',
        content: systemParts.join('\n\n'),
      });
      used += systemParts.reduce((a, p) => a + estimateTokens(p), 0);
    }

    for (const m of historyMessages) {
      messages.push(m);
      used += estimateTokens(m.content) + 10;
    }

    if (codeBlock) {
      messages.push({
        role: 'system',
        content: '## Relevant Code\n\n' + codeBlock,
      });
      used += estimateTokens(codeBlock) + 20;
    }

    messages.push({ role: 'user', content: request });
    used += requestTokens;

    const truncated =
      historyTokens > historyUsed || codeTokens > codeUsed || knowledge.length > 0;

    return {
      messages,
      tokenCount: used,
      truncated,
    };
  }
}
