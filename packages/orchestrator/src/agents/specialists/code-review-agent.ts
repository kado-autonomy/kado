import { Subagent } from '../subagent.js';
import type { SubagentOptions } from '../subagent.js';
import type { ReviewResult, ReviewIssue } from '../types.js';

const SYSTEM_PROMPT = `You are a code review specialist. Focus on:
- Code quality and maintainability
- Security vulnerabilities
- Best practices and patterns
- Performance issues
- Error handling and edge cases
Provide structured, actionable feedback.`;

const TOOLS = ['file_read', 'grep_search', 'glob_search'];

export class CodeReviewAgent extends Subagent {
  constructor(options: SubagentOptions) {
    super(options);
  }

  protected override buildSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  protected override getTools(): string[] {
    return TOOLS;
  }

  async review(files: string[]): Promise<ReviewResult> {
    const result = await this.run(
      `Review the following files: ${files.join(', ')}`
    );
    if (!result.success) {
      return {
        issues: [],
        score: 0,
        summary: result.output,
      };
    }
    const parsed = this.parseReviewOutput(result.output);
    return parsed;
  }

  private parseReviewOutput(output: string): ReviewResult {
    const issues: ReviewIssue[] = [];
    const lines = output.split('\n');
    let score = 100;
    let summary = output;

    for (const line of lines) {
      const severityMatch = line.match(
        /(error|warning|info):\s*(.+)/i
      );
      if (severityMatch) {
        const severity = severityMatch[1]!.toLowerCase() as
          | 'error'
          | 'warning'
          | 'info';
        const message = severityMatch[2]!.trim();
        if (severity === 'error') score -= 20;
        else if (severity === 'warning') score -= 5;
        issues.push({
          file: '',
          severity,
          message,
        });
      }
    }

    const scoreMatch = output.match(/score[:\s]+(\d+)/i);
    if (scoreMatch) score = Math.max(0, Math.min(100, parseInt(scoreMatch[1]!, 10)));

    return {
      issues,
      score,
      summary,
    };
  }
}
