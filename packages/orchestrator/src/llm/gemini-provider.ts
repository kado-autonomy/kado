import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMResponse,
  StreamChunk,
  ToolDefinition,
} from './types.js';
import type { LLMProvider } from './provider.js';
import { countTokens } from './token-counter.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const SUPPORTED_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { content: unknown } } };

function toGeminiContents(messages: LLMMessage[]): { contents: GeminiContent[]; systemInstruction?: { parts: Array<{ text: string }> } } {
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: m.content }] };
      continue;
    }

    if (m.role === 'tool') {
      let parsed: unknown;
      try { parsed = JSON.parse(m.content); } catch { parsed = m.content; }
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: m.toolCallId ?? 'unknown',
            response: { content: parsed },
          },
        }],
      });
      continue;
    }

    if (m.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.toolCalls?.length) {
        for (const tc of m.toolCalls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.arguments); } catch { /* empty */ }
          parts.push({ functionCall: { name: tc.name, args } });
        }
      }
      if (parts.length) contents.push({ role: 'model', parts });
      continue;
    }

    contents.push({ role: 'user', parts: [{ text: m.content }] });
  }

  return { contents, systemInstruction };
}

function toGeminiTools(tools?: ToolDefinition[]): object[] | undefined {
  if (!tools?.length) return undefined;
  return [{
    functionDeclarations: tools.map((t) => ({
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
    })),
  }];
}

export class GeminiProvider implements LLMProvider {
  readonly modelId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = GEMINI_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.modelId = SUPPORTED_MODELS[0] ?? 'gemini-2.5-pro';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMResponse> {
    const model = options?.model ?? this.modelId;
    const { contents, systemInstruction } = toGeminiContents(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    const tools = toGeminiTools(options?.tools);
    if (tools) body.tools = tools;

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> };
        finishReason?: string;
      }>;
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const usage = data.usageMetadata;

    let content = '';
    const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for (const part of parts) {
      if (part.text) content += part.text;
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      usage: {
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
      },
      finishReason: candidate?.finishReason ?? 'STOP',
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<StreamChunk> {
    const model = options?.model ?? this.modelId;
    const { contents, systemInstruction } = toGeminiContents(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    const tools = toGeminiTools(options?.tools);
    if (tools) body.tools = tools;

    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
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
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            yield { done: true };
            return;
          }
          try {
            const parsed = JSON.parse(payload) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> };
                finishReason?: string;
              }>;
            };
            const parts = parsed.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (part.text) yield { content: part.text, done: false };
              if (part.functionCall) {
                yield {
                  toolCall: {
                    id: `call_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args ?? {}),
                  },
                  done: false,
                };
              }
            }
            if (parsed.candidates?.[0]?.finishReason === 'STOP') {
              yield { done: true };
              return;
            }
          } catch {
            // skip malformed chunks
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
