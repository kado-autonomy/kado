import { EventEmitter } from 'eventemitter3';

export type OrchestratorState =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'complete'
  | 'error';

export interface StateChangePayload {
  from: OrchestratorState;
  to: OrchestratorState;
}

export interface ProgressPayload {
  step: string;
  progress: number;
  message?: string;
}

export interface MessagePayload {
  type: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  stack?: string;
}

export interface CompletePayload {
  success: boolean;
  results?: unknown[];
}

export interface ToolCallPayload {
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResultPayload {
  toolName: string;
  success: boolean;
  result?: unknown;
}

export interface FileChangePayload {
  filePath: string;
  original: string;
  modified: string;
  language: string;
  status: 'added' | 'modified' | 'deleted';
}

export interface FileChangesPayload {
  changes: FileChangePayload[];
}

export interface PlanStepInfo {
  id: string;
  toolName: string;
  description: string;
  dependsOn: string[];
}

export interface PlanCreatedPayload {
  planId: string;
  title: string;
  steps: PlanStepInfo[];
}

export interface VerificationProgressPayload {
  phase: 'build' | 'lint' | 'test';
  status: 'running' | 'passed' | 'failed';
  details?: string;
}

export interface StepCompletePayload {
  stepId: string;
  stepIndex: number;
  totalSteps: number;
  success: boolean;
  duration: number;
  toolName: string;
  description: string;
}

export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface DebugPayload {
  level: DebugLevel;
  source: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

export interface WorktreeDiffFilePayload {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  original: string;
  modified: string;
  additions: number;
  deletions: number;
}

export interface WorktreeDiffPayload {
  taskId: string;
  branch: string;
  files: WorktreeDiffFilePayload[];
}

export interface WorktreeAcceptedPayload {
  taskId: string;
}

export interface WorktreeRejectedPayload {
  taskId: string;
}

export interface OrchestratorEvents {
  stateChange: StateChangePayload;
  progress: ProgressPayload;
  message: MessagePayload;
  error: ErrorPayload;
  complete: CompletePayload;
  toolCall: ToolCallPayload;
  toolResult: ToolResultPayload;
  fileChanges: FileChangesPayload;
  planCreated: PlanCreatedPayload;
  verificationProgress: VerificationProgressPayload;
  stepComplete: StepCompletePayload;
  debug: DebugPayload;
  worktreeDiff: WorktreeDiffPayload;
  worktreeAccepted: WorktreeAcceptedPayload;
  worktreeRejected: WorktreeRejectedPayload;
}

export class EventBus extends EventEmitter<OrchestratorEvents> {
  emitStateChange(from: OrchestratorState, to: OrchestratorState): void {
    this.emit('stateChange', { from, to });
  }

  emitProgress(step: string, progress: number, message?: string): void {
    this.emit('progress', { step, progress, message });
  }

  emitMessage(type: MessagePayload['type'], content: string): void {
    this.emit('message', { type, content });
  }

  emitError(message: string, code?: string, stack?: string): void {
    this.emit('error', { message, code, stack });
  }

  emitComplete(success: boolean, results?: unknown[]): void {
    this.emit('complete', { success, results });
  }

  emitToolCall(toolName: string, args: Record<string, unknown>): void {
    this.emit('toolCall', { toolName, args });
  }

  emitToolResult(toolName: string, success: boolean, result?: unknown): void {
    this.emit('toolResult', { toolName, success, result });
  }

  emitFileChanges(changes: FileChangePayload[]): void {
    this.emit('fileChanges', { changes });
  }

  emitPlanCreated(planId: string, title: string, steps: PlanStepInfo[]): void {
    this.emit('planCreated', { planId, title, steps });
  }

  emitVerificationProgress(
    phase: VerificationProgressPayload['phase'],
    status: VerificationProgressPayload['status'],
    details?: string
  ): void {
    this.emit('verificationProgress', { phase, status, details });
  }

  emitStepComplete(
    stepId: string,
    stepIndex: number,
    totalSteps: number,
    success: boolean,
    duration: number,
    toolName: string,
    description: string
  ): void {
    this.emit('stepComplete', {
      stepId,
      stepIndex,
      totalSteps,
      success,
      duration,
      toolName,
      description,
    });
  }

  emitDebug(level: DebugLevel, source: string, message: string, data?: unknown): void {
    this.emit('debug', { level, source, message, data, timestamp: Date.now() });
  }

  emitWorktreeDiff(taskId: string, branch: string, files: WorktreeDiffFilePayload[]): void {
    this.emit('worktreeDiff', { taskId, branch, files });
  }

  emitWorktreeAccepted(taskId: string): void {
    this.emit('worktreeAccepted', { taskId });
  }

  emitWorktreeRejected(taskId: string): void {
    this.emit('worktreeRejected', { taskId });
  }
}
