import { Subagent } from '../subagent.js';
import type { SubagentOptions } from '../subagent.js';
import type { TestGenerationResult } from '../types.js';

const SYSTEM_PROMPT = `You are a test writing specialist. Focus on:
- Comprehensive unit and integration tests
- Edge cases and error handling
- Test clarity and maintainability
- Appropriate use of mocks and fixtures
- Coverage of critical paths`;

const TOOLS = ['file_read', 'file_write', 'shell_execute'];

export class TestWriterAgent extends Subagent {
  constructor(options: SubagentOptions) {
    super(options);
  }

  protected override buildSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  protected override getTools(): string[] {
    return TOOLS;
  }

  async generateTests(sourceFile: string): Promise<TestGenerationResult> {
    const result = await this.run(
      `Generate comprehensive tests for: ${sourceFile}`
    );
    if (!result.success) {
      return {
        success: false,
        testFiles: [],
        summary: result.output,
      };
    }
    return {
      success: true,
      testFiles: result.artifacts ?? [],
      summary: result.output,
    };
  }
}
