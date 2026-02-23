import { Subagent } from '../subagent.js';
import type { SubagentOptions } from '../subagent.js';
import type { RefactorResult } from '../types.js';

const SYSTEM_PROMPT = `You are a refactoring specialist. Focus on:
- Improving code structure without changing behavior
- Reducing duplication (DRY)
- Improving readability and naming
- Simplifying complex logic
- Preserving existing functionality`;

const TOOLS = ['file_read', 'file_write', 'file_edit', 'grep_search'];

export class RefactorAgent extends Subagent {
  constructor(options: SubagentOptions) {
    super(options);
  }

  protected override buildSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  protected override getTools(): string[] {
    return TOOLS;
  }

  async refactor(
    files: string[],
    instruction: string
  ): Promise<RefactorResult> {
    const result = await this.run(
      `Refactor ${files.join(', ')}. Instruction: ${instruction}`
    );
    if (!result.success) {
      return {
        success: false,
        modifiedFiles: [],
        summary: result.output,
      };
    }
    return {
      success: true,
      modifiedFiles: result.artifacts ?? files,
      summary: result.output,
    };
  }
}
