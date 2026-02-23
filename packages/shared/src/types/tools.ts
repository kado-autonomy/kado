export type ToolParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object';

export interface ToolParameter {
  name: string;
  type: ToolParameterType;
  description: string;
  required: boolean;
  default?: unknown;
}

export type ToolCategory =
  | 'file'
  | 'search'
  | 'execution'
  | 'analysis'
  | 'web';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category: ToolCategory;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

export interface ToolInvocation {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  startedAt: number;
  completedAt?: number;
  result?: ToolResult;
}
