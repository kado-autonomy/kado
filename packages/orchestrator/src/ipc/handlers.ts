import type { Orchestrator } from '../core/orchestrator.js';
import type { Plan } from '../planning/types.js';

export interface ProcessRequestPayload {
  message: string;
  sessionId: string;
}

export interface ProcessRequestResult {
  success: boolean;
  error?: string;
}

export interface GetStatusResult {
  state: string;
  currentTask: string | null;
  taskQueueSize: number;
}

export interface SubagentInfo {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'waiting' | 'completed' | 'failed';
  currentTask: string;
  progress: number;
  startedAt: number;
}

export interface GetPlanResult {
  plan: Plan | null;
}

export function createHandlers(orchestrator: Orchestrator) {
  return {
    async handleProcessRequest(
      _event: unknown,
      payload: ProcessRequestPayload
    ): Promise<ProcessRequestResult> {
      try {
        await orchestrator.processRequest(payload.message);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    },

    handleListSubagents(): SubagentInfo[] {
      return [];
    },

    handleKillSubagent(_event: unknown, _id: string): void {
      // Subagent lifecycle management will be implemented with the agent pool
    },

    handleAbort(): void {
      orchestrator.abort();
    },

    handleGetStatus(): GetStatusResult {
      return {
        state: orchestrator.state,
        currentTask: orchestrator.currentTask,
        taskQueueSize: orchestrator.taskQueue.size(),
      };
    },

    handleGetPlan(): GetPlanResult {
      return { plan: orchestrator.currentPlan };
    },
  };
}
