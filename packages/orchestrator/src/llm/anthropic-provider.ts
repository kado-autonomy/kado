import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMResponse,
  StreamChunk,
  ToolDefinition,
} from './types.js';
import type { LLMProvider } from './provider.js';
import { countTokens } from './token-counter.js';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const SUPPORTED_MODELS = [
  'claude-sonnet-4-6-20260217',
  'claude-opus-4-6-20260205',
  'claude-sonnet-4-5-20250514',
  'claude-opus-4-5-20250414',
];

function toAnthropicMessages(messages: LLMMessage[]): object[] {
  const result: object[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'tool') {
      result.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }],
      });
      continue;
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      const content: object[] = [];
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const tc of m.toolCalls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: (() => {
            try {
              return JSON.parse(tc.arguments);
            } catch {
              return {};
            }
          })(),
        });
      }
      result.push({ role: 'assistant', content });
      continue;
    }
    result.push({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    });
  }
  return result;
}

function getSystemMessage(messages: LLMMessage[]): string | undefined {
  return messages.find((m) => m.role === 'system')?.content;
}

function toAnthropicTools(tools?: ToolDefinition[]): object[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        t.parameters.map((p) => [
          p.name,
          { type: p.type, description: p.description },
        ])
      ),
      required: t.parameters.filter((p) => p.required).map((p) => p.name),
    },
  }));
}

export class AnthropicProvider implements LLMProvider {
  readonly modelId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = ANTHROPIC_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.modelId = SUPPORTED_MODELS[0] ?? 'claude-sonnet-4-6-20260217';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.modelId;
    const system = getSystemMessage(messages);
    const anthropicMessages = toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.maxTokens ?? 4096,
      messages: anthropicMessages,
      temperature: options?.temperature ?? 0.7,
    };
    if (system) body.system = system;
    const tools = toAnthropicTools(options?.tools);
    if (tools?.length) body.tools = tools;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      content?: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
      stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    let content = '';
    const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for (const block of data.content ?? []) {
      if (block.type === 'text') content += block.text ?? '';
      if (block.type === 'tool_use' && block.id && block.name) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        });
      }
    }

    const usage = data.usage;

    return {
      content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      usage: {
        promptTokens: usage?.input_tokens ?? 0,
        completionTokens: usage?.output_tokens ?? 0,
        totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason ?? 'end_turn',
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<StreamChunk> {
    const model = options?.model ?? this.modelId;
    const system = getSystemMessage(messages);
    const anthropicMessages = toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.maxTokens ?? 4096,
      messages: anthropicMessages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
    };
    if (system) body.system = system;
    const tools = toAnthropicTools(options?.tools);
    if (tools?.length) body.tools = tools;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
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
                type?: string;
                delta?: { type?: string; text?: string; stop_reason?: string };
                message?: { stop_reason?: string };
                content_block?: {
                  type?: string;
                  text?: string;
                  id?: string;
                  name?: string;
                  input?: Record<string, unknown>;
                };
              };
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield { content: parsed.delta.text, done: false };
              }
              if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
                const cb = parsed.content_block;
                yield {
                  toolCall: {
                    id: cb.id,
                    name: cb.name,
                    arguments: JSON.stringify(cb.input ?? {}),
                  },
                  done: false,
                };
              }
              if (parsed.message?.stop_reason === 'end_turn') {
                yield { done: true };
                return;
              }
            } catch {
              // skip
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
