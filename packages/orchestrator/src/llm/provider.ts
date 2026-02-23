import type {
  LLMMessage,
  LLMCompletionOptions,
  LLMResponse,
  StreamChunk,
} from './types.js';

export interface LLMProvider {
  modelId?: string;
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMResponse>;
  stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<StreamChunk>;
  countTokens(text: string): number;
}
