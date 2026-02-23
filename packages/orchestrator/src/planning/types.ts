export type PlanStatus = 'draft' | 'executing' | 'complete' | 'failed' | 'infeasible';

export interface PlanStep {
  id: string;
  description: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  dependsOn: string[];
  status: 'pending' | 'running' | 'complete' | 'failed';
  result?: unknown;
}

export interface Plan {
  id: string;
  title: string;
  steps: PlanStep[];
  status: PlanStatus;
  infeasibleReason?: string;
}

export interface ExecutionResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  rollbackInfo?: string;
  emptyResult?: boolean;
}

export interface CodeSnippet {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
  symbolName?: string;
  symbolType?: string;
}

export interface Context {
  files: string[];
  memory: unknown[];
  knowledge: unknown[];
  projectPath?: string;
  relevantFiles?: string[];
  conversationSummary?: string;
  projectInstructions?: string;
  codeSnippets?: CodeSnippet[];
  projectStructure?: string;
}

export interface VerificationResult {
  passed: boolean;
  issues: string[];
  suggestions: string[];
  canRetry: boolean;
}
