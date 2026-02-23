import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Tool, ToolResult } from './types.js';

const execAsync = promisify(exec);

function detectTestFramework(projectPath: string): { command: string; args: string } | null {
  if (existsSync(resolve(projectPath, 'vitest.config.ts')) || existsSync(resolve(projectPath, 'vitest.config.js'))) {
    return { command: 'npx vitest run', args: '' };
  }
  if (existsSync(resolve(projectPath, 'jest.config.ts')) || existsSync(resolve(projectPath, 'jest.config.js')) || existsSync(resolve(projectPath, 'jest.config.json'))) {
    return { command: 'npx jest', args: '--passWithNoTests' };
  }
  if (existsSync(resolve(projectPath, 'pyproject.toml')) || existsSync(resolve(projectPath, 'pytest.ini'))) {
    return { command: 'python -m pytest', args: '-v' };
  }
  return null;
}

export const TestRunnerTool: Tool = {
  definition: {
    name: 'test_runner',
    description: 'Run test suite',
    category: 'execution',
    parameters: [
      { name: 'command', type: 'string', description: 'Override test command', required: false },
      { name: 'testPath', type: 'string', description: 'Test path or pattern', required: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const customCommand = args.command as string | undefined;
      const testPath = args.testPath as string | undefined;
      let cmd: string;
      if (customCommand) {
        cmd = customCommand;
        if (testPath) cmd += ` ${testPath}`;
      } else {
        const framework = detectTestFramework(ctx.projectPath);
        if (!framework) {
          return {
            success: true,
            data: { passed: 0, failed: 0, total: 0, output: 'No test framework detected in project' },
            duration: Date.now() - start,
          };
        }
        const { command, args: extraArgs } = framework;
        cmd = testPath ? `${command} ${testPath}` : `${command} ${extraArgs ?? ''}`.trim();
      }
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: ctx.projectPath,
        timeout: 60000,
        signal: ctx.signal ?? undefined,
      });
      const output = stdout + (stderr ? `\n${stderr}` : '');
      const passedMatch = output.match(/(\d+)\s+passed/i) ?? output.match(/passed:\s*(\d+)/i);
      const failedMatch = output.match(/(\d+)\s+failed/i) ?? output.match(/failed:\s*(\d+)/i);
      const totalMatch = output.match(/(\d+)\s+total/i) ?? output.match(/tests?:\s*(\d+)/i);
      const passed = passedMatch ? parseInt(passedMatch[1] ?? '0', 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1] ?? '0', 10) : 0;
      const total = totalMatch ? parseInt(totalMatch[1] ?? '0', 10) : passed + failed;
      return {
        success: failed === 0,
        data: { passed, failed, total, output },
        duration: Date.now() - start,
      };
    } catch (err) {
      const output = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        data: { passed: 0, failed: 1, total: 1, output },
        error: output,
        duration: Date.now() - start,
      };
    }
  },
};
