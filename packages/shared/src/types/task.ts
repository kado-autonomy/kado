export enum TaskStatus {
  Pending = 'pending',
  Planning = 'planning',
  Executing = 'executing',
  Verifying = 'verifying',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  parentId?: string;
  subtasks: Task[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}
