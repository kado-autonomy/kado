export type SubagentStatus = "idle" | "running" | "waiting" | "completed" | "failed";

export interface SubagentMessage {
  from: string;
  to: string;
  type: string;
  timestamp: number;
}

export interface SubagentInfo {
  id: string;
  name: string;
  role: string;
  status: SubagentStatus;
  currentTask: string;
  progress: number;
  startedAt: number;
  messages: SubagentMessage[];
}
