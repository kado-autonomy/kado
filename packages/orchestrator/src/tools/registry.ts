import type { Tool, ToolDefinition } from './types.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private aliases = new Map<string, string>();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  registerAlias(alias: string, canonicalName: string): void {
    this.aliases.set(alias, canonicalName);
  }

  private resolve(name: string): string {
    return this.aliases.get(name) ?? name;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(this.resolve(name));
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  listByCategory(cat: ToolDefinition['category']): ToolDefinition[] {
    return this.list().filter((d) => d.category === cat);
  }

  has(name: string): boolean {
    return this.tools.has(this.resolve(name));
  }

  allKnownNames(): string[] {
    return [...this.tools.keys(), ...this.aliases.keys()];
  }

  toOpenAIFormat(): object[] {
    return this.list().map((def) => ({
      type: 'function',
      function: {
        name: def.name,
        description: def.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            def.parameters.map((p) => [
              p.name,
              { type: p.type, description: p.description },
            ])
          ),
          required: def.parameters.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));
  }
}
