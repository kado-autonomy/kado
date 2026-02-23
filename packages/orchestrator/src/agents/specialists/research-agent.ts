import { Subagent } from '../subagent.js';
import type { SubagentOptions } from '../subagent.js';
import type { ResearchResult } from '../types.js';

const SYSTEM_PROMPT = `You are a research specialist. Focus on:
- Thorough investigation of technical topics
- Synthesizing information from multiple sources
- Clear, structured findings
- Citing sources and evidence
- Identifying trade-offs and alternatives`;

const TOOLS = ['web_search', 'semantic_search', 'file_read'];

export class ResearchAgent extends Subagent {
  constructor(options: SubagentOptions) {
    super(options);
  }

  protected override buildSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  protected override getTools(): string[] {
    return TOOLS;
  }

  async research(query: string): Promise<ResearchResult> {
    const result = await this.run(`Research: ${query}`);
    if (!result.success) {
      return {
        success: false,
        findings: [],
        sources: [],
        summary: result.output,
      };
    }
    return {
      success: true,
      findings: result.artifacts ?? [],
      sources: [],
      summary: result.output,
    };
  }
}
