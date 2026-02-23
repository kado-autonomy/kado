export type AgentRole =
  | 'orchestrator'
  | 'code-review'
  | 'test-writer'
  | 'documentation'
  | 'refactor'
  | 'research';

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed';

export type AgentMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AgentMessage {
  id: string;
  agentId: string;
  role: AgentMessageRole;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  currentTask?: string;
  messages: AgentMessage[];
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}
