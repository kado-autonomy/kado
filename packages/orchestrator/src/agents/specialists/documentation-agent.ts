import { Subagent } from '../subagent.js';
import type { SubagentOptions } from '../subagent.js';
import type { DocResult } from '../types.js';

const SYSTEM_PROMPT = `You are a documentation specialist. Focus on:
- Clear, accurate technical documentation
- API documentation with examples
- README files and usage guides
- Inline comments where appropriate
- Consistent formatting and structure`;

const TOOLS = ['file_read', 'file_write', 'glob_search'];

export class DocumentationAgent extends Subagent {
  constructor(options: SubagentOptions) {
    super(options);
  }

  protected override buildSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  protected override getTools(): string[] {
    return TOOLS;
  }

  async generateDocs(files: string[]): Promise<DocResult> {
    const result = await this.run(
      `Generate documentation for: ${files.join(', ')}`
    );
    if (!result.success) {
      return {
        success: false,
        files: [],
        summary: result.output,
      };
    }
    return {
      success: true,
      files: result.artifacts ?? [],
      summary: result.output,
    };
  }
}
