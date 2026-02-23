import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../../core/orchestrator.js';
import type { ToolRegistry, LLMProvider } from '../../core/orchestrator.js';

function createMockToolRegistry(): ToolRegistry {
  return {
    execute: vi.fn().mockResolvedValue({ success: true }),
    has: vi.fn().mockReturnValue(true),
  };
}

function mockLLMResponse(content: string) {
  return { content, usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }, finishReason: 'stop' };
}

function createMockLLMProvider(planResponse?: string): LLMProvider {
  const defaultPlan = JSON.stringify({
    title: 'Test plan',
    steps: [
      {
        id: 'step-1',
        description: 'Read the file',
        toolName: 'file_read',
        toolArgs: { path: 'test.ts' },
        dependsOn: [],
      },
      {
        id: 'step-2',
        description: 'Edit the file',
        toolName: 'file_edit',
        toolArgs: { path: 'test.ts', content: 'updated' },
        dependsOn: ['step-1'],
      },
    ],
  });

  return {
    complete: vi.fn()
      .mockResolvedValueOnce(mockLLMResponse(planResponse ?? defaultPlan))
      .mockResolvedValue(mockLLMResponse('No issues found.')),
  };
}

describe('Orchestrator full flow', () => {
  let orchestrator: Orchestrator;
  let tools: ToolRegistry;
  let llm: LLMProvider;

  beforeEach(() => {
    tools = createMockToolRegistry();
    llm = createMockLLMProvider();
    orchestrator = new Orchestrator({
      toolRegistry: tools,
      llmProvider: llm,
      projectPath: '/tmp/test-project',
    });
  });

  describe('processRequest -> plan -> execute -> verify', () => {
    it('transitions through all states for a successful request', async () => {
      const stateChanges: Array<{ from: string; to: string }> = [];
      orchestrator.events.on('stateChange', (payload) => {
        stateChanges.push({ from: payload.from, to: payload.to });
      });

      await orchestrator.processRequest('Add a hello world function');

      const states = stateChanges.map((s) => s.to);
      expect(states).toContain('planning');
      expect(states).toContain('executing');
      expect(states).toContain('verifying');
    });

    it('calls LLM provider to create a plan', async () => {
      await orchestrator.processRequest('Fix the bug in utils.ts');

      expect(llm.complete).toHaveBeenCalled();
      const firstCallArgs = (llm.complete as ReturnType<typeof vi.fn>).mock.calls[0];
      const messages = firstCallArgs?.[0] as Array<{ role: string; content: string }>;
      expect(messages.some((m) => m.content.includes('Fix the bug in utils.ts'))).toBe(true);
    });

    it('executes tool calls from the plan', async () => {
      await orchestrator.processRequest('Read and update a file');

      expect(tools.execute).toHaveBeenCalledWith('file_read', { path: 'test.ts' });
      expect(tools.execute).toHaveBeenCalledWith('file_edit', {
        path: 'test.ts',
        content: 'updated',
      });
    });

    it('emits message events', async () => {
      const messages: Array<{ type: string; content: string }> = [];
      orchestrator.events.on('message', (payload) => {
        messages.push({ type: payload.type, content: payload.content });
      });

      await orchestrator.processRequest('Do something');

      expect(messages.some((m) => m.type === 'user' && m.content === 'Do something')).toBe(true);
    });
  });

  describe('abort mid-execution', () => {
    it('stops execution when abort is called', async () => {
      const slowTool = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );
      const slowTools: ToolRegistry = {
        execute: slowTool,
        has: vi.fn().mockReturnValue(true),
      };

      const slowOrchestrator = new Orchestrator({
        toolRegistry: slowTools,
        llmProvider: llm,
        projectPath: '/tmp/test-project',
      });

      const promise = slowOrchestrator.processRequest('Long running task');

      await new Promise((r) => setTimeout(r, 50));
      slowOrchestrator.abort();

      await promise;

      expect(slowTool.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('error recovery', () => {
    it('transitions to error state when LLM fails', async () => {
      const failingLLM: LLMProvider = {
        complete: vi.fn().mockRejectedValue(new Error('LLM API error')),
      };

      const errorOrchestrator = new Orchestrator({
        toolRegistry: tools,
        llmProvider: failingLLM,
        projectPath: '/tmp/test-project',
      });

      const errors: string[] = [];
      errorOrchestrator.events.on('error', (payload) => {
        errors.push(payload.message);
      });

      const stateChanges: string[] = [];
      errorOrchestrator.events.on('stateChange', (payload) => {
        stateChanges.push(payload.to);
      });

      await errorOrchestrator.processRequest('This will fail');

      expect(errors.some((e) => e.includes('LLM API error'))).toBe(true);
      expect(stateChanges).toContain('error');
    });

    it('transitions to error when all tool executions fail', async () => {
      const failingTools: ToolRegistry = {
        execute: vi.fn().mockRejectedValue(new Error('Tool crashed')),
        has: vi.fn().mockReturnValue(true),
      };

      const freshLlm = createMockLLMProvider();
      const errorOrchestrator = new Orchestrator({
        toolRegistry: failingTools,
        llmProvider: freshLlm,
        projectPath: '/tmp/test-project',
      });

      const errors: string[] = [];
      errorOrchestrator.events.on('error', (payload) => {
        errors.push(payload.message);
      });

      let completedWithSuccess: boolean | null = null;
      errorOrchestrator.events.on('complete', (payload) => {
        completedWithSuccess = (payload as { success: boolean }).success;
      });

      await errorOrchestrator.processRequest('Task with failing tool');

      expect(failingTools.execute).toHaveBeenCalled();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('failed');
      expect(completedWithSuccess).toBeNull();
    });

    it('completes with success=false when some steps fail', async () => {
      let callCount = 0;
      const partialTools: ToolRegistry = {
        execute: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve({ ok: true });
          return Promise.reject(new Error('Step 2 failed'));
        }),
        has: vi.fn().mockReturnValue(true),
      };

      const freshLlm = createMockLLMProvider();
      const partialOrchestrator = new Orchestrator({
        toolRegistry: partialTools,
        llmProvider: freshLlm,
        projectPath: '/tmp/test-project',
      });

      let completedWithSuccess: boolean | null = null;
      partialOrchestrator.events.on('complete', (payload) => {
        completedWithSuccess = (payload as { success: boolean }).success;
      });

      await partialOrchestrator.processRequest('Task with partial failure');

      expect(completedWithSuccess).toBe(false);
    });

    it('cleans up state after processing', async () => {
      await orchestrator.processRequest('Some task');

      expect(orchestrator.currentTask).toBeNull();
      expect(orchestrator.currentPlan).toBeNull();
    });
  });

  describe('context gathering', () => {
    it('gathers context including code snippets', async () => {
      const context = await orchestrator.gatherContext({
        id: 'test-id',
        description: 'test task',
      });

      expect(context).toHaveProperty('files');
      expect(context).toHaveProperty('memory');
      expect(context).toHaveProperty('knowledge');
      expect(Array.isArray(context.files)).toBe(true);
    });
  });

  describe('plan parsing', () => {
    it('handles malformed LLM plan response gracefully', async () => {
      const badLLM: LLMProvider = {
        complete: vi.fn()
          .mockResolvedValueOnce(mockLLMResponse('this is not valid json {{{'))
          .mockResolvedValue(mockLLMResponse('OK')),
      };

      const orch = new Orchestrator({
        toolRegistry: tools,
        llmProvider: badLLM,
        projectPath: '/tmp/test-project',
      });

      await orch.processRequest('Task with bad plan');
    });

    it('handles empty steps in plan', async () => {
      const emptyPlanLLM: LLMProvider = {
        complete: vi.fn()
          .mockResolvedValueOnce(mockLLMResponse(JSON.stringify({ title: 'Empty', steps: [] })))
          .mockResolvedValue(mockLLMResponse('OK')),
      };

      const orch = new Orchestrator({
        toolRegistry: tools,
        llmProvider: emptyPlanLLM,
        projectPath: '/tmp/test-project',
      });

      await orch.processRequest('Task with empty plan');
    });
  });
});
