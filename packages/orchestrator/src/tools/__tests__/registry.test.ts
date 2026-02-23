import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '../registry.js';
import type { Tool } from '../types.js';

const createMockTool = (name: string, category: Tool['definition']['category'] = 'file'): Tool => ({
  definition: {
    name,
    description: `Tool ${name}`,
    category,
    parameters: [
      { name: 'input', type: 'string', description: 'Input', required: true },
    ],
  },
  async execute() {
    return { success: true, data: null, duration: 0 };
  },
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register and retrieve', () => {
    it('registers and retrieves tool by name', () => {
      const tool = createMockTool('my_tool');
      registry.register(tool);
      expect(registry.get('my_tool')).toBe(tool);
    });

    it('returns undefined for unregistered tool', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('overwrites when registering same name', () => {
      const tool1 = createMockTool('dup');
      const tool2 = createMockTool('dup');
      registry.register(tool1);
      registry.register(tool2);
      expect(registry.get('dup')).toBe(tool2);
    });
  });

  describe('list tools by category', () => {
    it('filters tools by category', () => {
      registry.register(createMockTool('f1', 'file'));
      registry.register(createMockTool('f2', 'file'));
      registry.register(createMockTool('s1', 'search'));
      const fileTools = registry.listByCategory('file');
      expect(fileTools).toHaveLength(2);
      expect(fileTools.map((t) => t.name).sort()).toEqual(['f1', 'f2']);
    });

    it('returns empty array for empty category', () => {
      registry.register(createMockTool('f1', 'file'));
      expect(registry.listByCategory('search')).toHaveLength(0);
    });
  });

  describe('has', () => {
    it('returns true for registered tool', () => {
      registry.register(createMockTool('exists'));
      expect(registry.has('exists')).toBe(true);
    });

    it('returns false for unregistered tool', () => {
      expect(registry.has('missing')).toBe(false);
    });
  });

  describe('toOpenAIFormat', () => {
    it('returns OpenAI function format', () => {
      registry.register(createMockTool('test_tool'));
      const format = registry.toOpenAIFormat();
      expect(format).toHaveLength(1);
      expect(format[0]).toMatchObject({
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'Tool test_tool',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Input' },
            },
            required: ['input'],
          },
        },
      });
    });

    it('includes optional params without required', () => {
      const tool: Tool = {
        definition: {
          name: 'opt',
          description: 'Opt',
          category: 'file',
          parameters: [
            { name: 'opt1', type: 'string', description: 'Optional', required: false },
          ],
        },
        async execute() {
          return { success: true, data: null, duration: 0 };
        },
      };
      registry.register(tool);
      const format = registry.toOpenAIFormat();
      expect(format[0].function.parameters.required).toEqual([]);
    });
  });

  describe('list', () => {
    it('returns all tool definitions', () => {
      registry.register(createMockTool('a'));
      registry.register(createMockTool('b'));
      const defs = registry.list();
      expect(defs).toHaveLength(2);
      expect(defs.map((d) => d.name).sort()).toEqual(['a', 'b']);
    });
  });
});
