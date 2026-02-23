import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMResponse,
  StreamChunk,
} from './types.js';
import type { LLMProvider } from './provider.js';
import { countTokens } from './token-counter.js';

function toOllamaMessages(messages: LLMMessage[]): object[] {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : 'system',
      content: m.content,
    }));
}

export class OllamaProvider implements LLMProvider {
  readonly modelId: string;
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434', modelId = 'llama2') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.modelId = modelId;
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.modelId;
    const body = {
      model,
      messages: toOllamaMessages(messages),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? 4096,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      message?: { content?: string };
      eval_count?: number;
      prompt_eval_count?: number;
      done?: boolean;
    };

    const content = data.message?.content ?? '';
    const completionTokens = data.eval_count ?? 0;
    const promptTokens = data.prompt_eval_count ?? 0;

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: data.done ? 'stop' : 'length',
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<StreamChunk> {
    const model = options?.model ?? this.modelId;
    const body = {
      model,
      messages: toOllamaMessages(messages),
      stream: true,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.maxTokens ?? 4096,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${err}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            if (parsed.message?.content) {
              yield { content: parsed.message.content, done: false };
            }
            if (parsed.done) {
              yield { done: true };
              return;
            }
          } catch {
            // skip
          }
        }
      }
      yield { done: true };
    } finally {
      reader.releaseLock();
    }
  }

  countTokens(text: string): number {
    return countTokens(text, this.modelId);
  }
}
