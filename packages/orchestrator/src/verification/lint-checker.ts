import { spawn } from 'child_process';

export interface LintIssue {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface LintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
  clean: boolean;
}

export class LintChecker {
  async checkLint(files: string[]): Promise<LintResult> {
    if (files.length === 0) return { errors: [], warnings: [], clean: true };

    const output = await this.runLintCommand(files);
    const { errors, warnings } = this.parseOutput(output, files);
    return {
      errors,
      warnings,
      clean: errors.length === 0,
    };
  }

  private runLintCommand(files: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('npx', ['eslint', ...files], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', () => resolve(stdout + stderr));
      proc.on('error', reject);
    });
  }

  private parseOutput(output: string, _files: string[]): { errors: LintIssue[]; warnings: LintIssue[] } {
    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];

    const lineRe = /([^:\s]+):(\d+):(\d+):\s*(.+?)\s+\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(output)) !== null) {
      const [, file, line, col, message, rule] = m;
      const issue: LintIssue = {
        file: file ?? '',
        line: line ? parseInt(line, 10) : undefined,
        column: col ? parseInt(col, 10) : undefined,
        message: `${message ?? ''} (${rule ?? ''})`,
        severity: (rule ?? '').includes('error') ? 'error' : 'warning',
      };
      if (issue.severity === 'error') errors.push(issue);
      else warnings.push(issue);
    }

    return { errors, warnings };
  }
}
