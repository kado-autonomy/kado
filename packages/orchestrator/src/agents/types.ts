export type AgentType =
  | 'code-review'
  | 'test-writer'
  | 'documentation'
  | 'refactor'
  | 'research';

export interface SubagentConfig {
  type: AgentType;
  task: string;
  tools?: string[];
  maxTokens?: number;
}

export interface SubagentInfo {
  id: string;
  type: AgentType;
  status: SubagentStatus;
  currentTask: string;
  progress: number;
  startedAt: number;
  tokenUsage: number;
}

export type SubagentStatus = 'idle' | 'running' | 'complete' | 'error' | 'aborted';

export interface SubagentResult {
  success: boolean;
  output: string;
  artifacts?: string[];
}

export interface ReviewIssue {
  file: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface ReviewResult {
  issues: ReviewIssue[];
  score: number;
  summary: string;
}

export interface TestGenerationResult {
  success: boolean;
  testFiles: string[];
  coverage?: number;
  summary: string;
}

export interface DocResult {
  success: boolean;
  files: string[];
  summary: string;
}

export interface RefactorResult {
  success: boolean;
  modifiedFiles: string[];
  summary: string;
}

export interface ResearchResult {
  success: boolean;
  findings: string[];
  sources: string[];
  summary: string;
}
