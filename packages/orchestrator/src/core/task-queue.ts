export type TaskStatus = 'pending' | 'running' | 'complete' | 'failed';

export type TaskPriority = number;

export interface Task {
  id: string;
  description: string;
  priority: TaskPriority;
  dependencies: string[];
  status: TaskStatus;
  result?: unknown;
}

export class TaskQueue {
  private queue: Task[] = [];
  private completedIds = new Set<string>();

  enqueue(task: Task, priority?: TaskPriority): void {
    const t: Task = {
      ...task,
      priority: priority ?? task.priority,
      status: 'pending',
    };
    this.queue.push(t);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): Task | undefined {
    const ready = this.queue.find(
      (t) =>
        t.status === 'pending' &&
        t.dependencies.every((dep) => this.completedIds.has(dep))
    );
    if (!ready) return undefined;
    this.queue = this.queue.filter((t) => t.id !== ready.id);
    return ready;
  }

  peek(): Task | undefined {
    return this.queue.find(
      (t) =>
        t.status === 'pending' &&
        t.dependencies.every((dep) => this.completedIds.has(dep))
    );
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }

  markComplete(id: string, result?: unknown): void {
    this.completedIds.add(id);
    const task = this.queue.find((t) => t.id === id);
    if (task) {
      task.status = 'complete';
      task.result = result;
    }
  }

  markFailed(id: string): void {
    const task = this.queue.find((t) => t.id === id);
    if (task) task.status = 'failed';
  }

  getDependencies(id: string): string[] {
    const task = this.queue.find((t) => t.id === id);
    return task?.dependencies ?? [];
  }
}
