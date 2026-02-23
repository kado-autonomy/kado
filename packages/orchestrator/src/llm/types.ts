import type { ToolDefinition } from '../tools/types.js';

export type { ToolDefinition };

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface LLMCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
  signal?: AbortSignal;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: string;
}

export interface StreamChunk {
  content?: string;
  toolCall?: Partial<ToolCall>;
  done: boolean;
}
