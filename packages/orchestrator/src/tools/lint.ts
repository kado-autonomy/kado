import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from './types.js';

const execAsync = promisify(exec);

function detectLinter(projectPath: string): 'eslint' | 'ruff' | null {
  if (existsSync(resolve(projectPath, 'eslint.config.js')) || existsSync(resolve(projectPath, '.eslintrc.js')) || existsSync(resolve(projectPath, '.eslintrc.json'))) {
    return 'eslint';
  }
  if (existsSync(resolve(projectPath, 'pyproject.toml'))) {
    return 'ruff';
  }
  return null;
}

export const LintTool: Tool = {
  definition: {
    name: 'lint',
    description: 'Run linter on files',
    category: 'analysis',
    parameters: [
      { name: 'files', type: 'array', description: 'Files to lint', required: false },
      { name: 'fix', type: 'boolean', description: 'Auto-fix issues', required: false, default: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const files = args.files as string[] | undefined;
      const fix = (args.fix as boolean) ?? false;
      const linter = detectLinter(ctx.projectPath);
      if (!linter) {
        return {
          success: true,
          data: { errors: 0, warnings: 0, fixed: 0, message: 'No linter detected' },
          duration: Date.now() - start,
        };
      }
      let cmd: string;
      if (linter === 'eslint') {
        const target = files?.length ? files.map((f) => resolve(ctx.projectPath, f)).join(' ') : '.';
        cmd = fix ? `npx eslint --fix ${target}` : `npx eslint ${target}`;
      } else {
        const target = files?.length ? files.join(' ') : '.';
        cmd = fix ? `ruff check --fix ${target}` : `ruff check ${target}`;
      }
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: ctx.projectPath,
        timeout: 30000,
        signal: ctx.signal,
      });
      const output = stdout + (stderr ? `\n${stderr}` : '');
      const errorMatch = output.match(/(\d+)\s+error/i) ?? output.match(/error[s]?:\s*(\d+)/i);
      const warnMatch = output.match(/(\d+)\s+warning/i) ?? output.match(/warning[s]?:\s*(\d+)/i);
      const errors = errorMatch ? parseInt(errorMatch[1] ?? '0', 10) : 0;
      const warnings = warnMatch ? parseInt(warnMatch[1] ?? '0', 10) : 0;
      return {
        success: errors === 0,
        data: { errors, warnings, fixed: fix ? 1 : 0, output },
        duration: Date.now() - start,
      };
    } catch (err) {
      const output = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        data: { errors: 1, warnings: 0, fixed: 0, output },
        error: output,
        duration: Date.now() - start,
      };
    }
  },
};
