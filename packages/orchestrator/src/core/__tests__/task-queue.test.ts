import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from '../task-queue.js';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  describe('enqueue/dequeue with priorities', () => {
    it('dequeues higher priority tasks first', () => {
      queue.enqueue({
        id: 'low',
        description: 'Low',
        priority: 1,
        dependencies: [],
        status: 'pending',
      });
      queue.enqueue({
        id: 'high',
        description: 'High',
        priority: 10,
        dependencies: [],
        status: 'pending',
      });
      queue.enqueue({
        id: 'mid',
        description: 'Mid',
        priority: 5,
        dependencies: [],
        status: 'pending',
      });
      expect(queue.dequeue()?.id).toBe('high');
      expect(queue.dequeue()?.id).toBe('mid');
      expect(queue.dequeue()?.id).toBe('low');
    });

    it('uses override priority when provided', () => {
      queue.enqueue(
        {
          id: 'a',
          description: 'A',
          priority: 1,
          dependencies: [],
          status: 'pending',
        },
        100
      );
      queue.enqueue(
        {
          id: 'b',
          description: 'B',
          priority: 50,
          dependencies: [],
          status: 'pending',
        },
        10
      );
      expect(queue.dequeue()?.id).toBe('a');
    });
  });

  describe('dependency tracking', () => {
    it('dequeues only when dependencies are complete', () => {
      queue.enqueue({
        id: 'dep',
        description: 'Dep',
        priority: 5,
        dependencies: [],
        status: 'pending',
      });
      queue.enqueue({
        id: 'child',
        description: 'Child',
        priority: 10,
        dependencies: ['dep'],
        status: 'pending',
      });
      expect(queue.dequeue()?.id).toBe('dep');
      expect(queue.dequeue()).toBeUndefined();
      queue.markComplete('dep');
      expect(queue.dequeue()?.id).toBe('child');
    });

    it('handles multiple dependencies', () => {
      queue.enqueue({
        id: 'a',
        description: 'A',
        priority: 5,
        dependencies: [],
        status: 'pending',
      });
      queue.enqueue({
        id: 'b',
        description: 'B',
        priority: 5,
        dependencies: [],
        status: 'pending',
      });
      queue.enqueue({
        id: 'c',
        description: 'C',
        priority: 10,
        dependencies: ['a', 'b'],
        status: 'pending',
      });
      const first = queue.dequeue();
      expect(first?.id).toBeDefined();
      expect(['a', 'b']).toContain(first?.id);
      queue.markComplete(first!.id);
      const second = queue.dequeue();
      expect(second?.id).toBeDefined();
      expect(['a', 'b']).toContain(second?.id);
      queue.markComplete(second!.id);
      expect(queue.dequeue()?.id).toBe('c');
    });
  });

  describe('empty queue behavior', () => {
    it('dequeue returns undefined when empty', () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it('dequeue returns undefined when no task has deps satisfied', () => {
      queue.enqueue({
        id: 'x',
        description: 'X',
        priority: 5,
        dependencies: ['nonexistent'],
        status: 'pending',
      });
      expect(queue.dequeue()).toBeUndefined();
    });
  });

  describe('peek and size', () => {
    it('peek returns next task without removing', () => {
      queue.enqueue({
        id: 'p',
        description: 'P',
        priority: 5,
        dependencies: [],
        status: 'pending',
      });
      expect(queue.peek()?.id).toBe('p');
      expect(queue.size()).toBe(1);
      expect(queue.dequeue()?.id).toBe('p');
      expect(queue.peek()).toBeUndefined();
    });

    it('size returns queue length', () => {
      expect(queue.size()).toBe(0);
      queue.enqueue({
        id: '1',
        description: '1',
        priority: 1,
        dependencies: [],
        status: 'pending',
      });
      expect(queue.size()).toBe(1);
      queue.enqueue({
        id: '2',
        description: '2',
        priority: 2,
        dependencies: [],
        status: 'pending',
      });
      expect(queue.size()).toBe(2);
      queue.dequeue();
      expect(queue.size()).toBe(1);
    });
  });

  describe('isEmpty', () => {
    it('returns true when empty', () => {
      expect(queue.isEmpty()).toBe(true);
    });

    it('returns false when tasks exist', () => {
      queue.enqueue({
        id: 'x',
        description: 'X',
        priority: 1,
        dependencies: [],
        status: 'pending',
      });
      expect(queue.isEmpty()).toBe(false);
    });
  });

  describe('getDependencies', () => {
    it('returns dependencies for task', () => {
      queue.enqueue({
        id: 't',
        description: 'T',
        priority: 1,
        dependencies: ['a', 'b'],
        status: 'pending',
      });
      expect(queue.getDependencies('t')).toEqual(['a', 'b']);
    });

    it('returns empty array for unknown task', () => {
      expect(queue.getDependencies('unknown')).toEqual([]);
    });
  });

  describe('markComplete and markFailed', () => {
    it('markComplete adds to completedIds so dependent tasks can run', () => {
      queue.enqueue({
        id: 'm',
        description: 'M',
        priority: 1,
        dependencies: [],
        status: 'pending',
      });
      const task = queue.dequeue();
      expect(task?.id).toBe('m');
      queue.markComplete('m', { result: 42 });
      queue.enqueue({
        id: 'n',
        description: 'N',
        priority: 1,
        dependencies: ['m'],
        status: 'pending',
      });
      expect(queue.dequeue()?.id).toBe('n');
    });

    it('markFailed updates task status so it is not dequeued', () => {
      queue.enqueue({
        id: 'f',
        description: 'F',
        priority: 1,
        dependencies: [],
        status: 'pending',
      });
      queue.markFailed('f');
      const task = queue.dequeue();
      expect(task).toBeUndefined();
    });
  });
});
