import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMResponse,
  StreamChunk,
  ToolDefinition,
} from './types.js';
import type { LLMProvider } from './provider.js';
import { countTokens } from './token-counter.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const SUPPORTED_MODELS = ['gpt-5.2', 'gpt-5', 'gpt-4.1', 'gpt-4o', 'o3-mini'];

function toOpenAIMessages(messages: LLMMessage[]): object[] {
  return messages.map((m) => {
    const base: Record<string, unknown> = { role: m.role, content: m.content };
    if (m.toolCalls?.length) {
      base.tool_calls = m.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    if (m.toolCallId) base.tool_call_id = m.toolCallId;
    return base;
  });
}

function toOpenAITools(tools?: ToolDefinition[]): object[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          t.parameters.map((p) => [
            p.name,
            { type: p.type, description: p.description },
          ])
        ),
        required: t.parameters.filter((p) => p.required).map((p) => p.name),
      },
    },
  }));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.status === 429 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error('Fetch failed');
}

export class OpenAIProvider implements LLMProvider {
  readonly modelId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = OPENAI_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.modelId = SUPPORTED_MODELS[0] ?? 'gpt-5.2';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.modelId;
    const body: Record<string, unknown> = {
      model,
      messages: toOpenAIMessages(messages),
      temperature: options?.temperature ?? 0.7,
      max_completion_tokens: options?.maxTokens ?? 4096,
    };
    const tools = toOpenAITools(options?.tools);
    if (tools?.length) body.tools = tools;

    const res = await fetchWithRetry(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      options?.signal
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      choices: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;
    const usage = data.usage;

    const toolCalls = msg?.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

    return {
      content: msg?.content ?? '',
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
      },
      finishReason: choice?.finish_reason ?? 'stop',
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<StreamChunk> {
    const model = options?.model ?? this.modelId;
    const body: Record<string, unknown> = {
      model,
      messages: toOpenAIMessages(messages),
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_completion_tokens: options?.maxTokens ?? 4096,
    };
    const tools = toOpenAITools(options?.tools);
    if (tools?.length) body.tools = tools;

    const res = await fetchWithRetry(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      options?.signal
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{
                  delta?: {
                    content?: string;
                    tool_calls?: Array<{
                      id?: string;
                      function?: { name?: string; arguments?: string };
                    }>;
                  };
                }>;
              };
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) yield { content: delta.content, done: false };
              if (delta?.tool_calls?.length) {
                for (const tc of delta.tool_calls) {
                  yield {
                    toolCall: {
                      id: tc.id,
                      name: tc.function?.name,
                      arguments: tc.function?.arguments,
                    },
                    done: false,
                  };
                }
              }
            } catch {
              // skip malformed lines
            }
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
