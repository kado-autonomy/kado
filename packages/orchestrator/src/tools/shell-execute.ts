import { exec } from 'child_process';
import { resolve } from 'path';
import type { Tool, ToolResult } from './types.js';

function execAsync(
  command: string,
  options: { cwd: string; timeout: number; signal?: AbortSignal }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolvePromise) => {
    const child = exec(command, options, (err, stdout, stderr) => {
      const out = stdout ?? '';
      const errOut = stderr ?? '';
      if (err) {
        const execErr = err as { killed?: boolean; code?: number };
        resolvePromise({
          stdout: out,
          stderr: errOut || (err.message ?? ''),
          exitCode: execErr.killed ? 124 : (typeof execErr.code === 'number' ? execErr.code : 1),
        });
      } else {
        resolvePromise({ stdout: out, stderr: errOut, exitCode: 0 });
      }
    });
    options.signal?.addEventListener('abort', () => child.kill('SIGTERM'));
  });
}

export const ShellExecuteTool: Tool = {
  definition: {
    name: 'shell_execute',
    description: 'Run a shell command',
    category: 'execution',
    parameters: [
      { name: 'command', type: 'string', description: 'Command to run', required: true },
      { name: 'cwd', type: 'string', description: 'Working directory', required: false },
      { name: 'timeout', type: 'number', description: 'Timeout in seconds (default 30)', required: false, default: 30 },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const command = args.command as string;
      const cwd = (args.cwd as string) ?? ctx.projectPath;
      const timeoutMs = ((args.timeout as number) ?? 30) * 1000;
      const workDir = resolve(ctx.projectPath, cwd);
      const { stdout, stderr, exitCode } = await execAsync(command, {
        cwd: workDir,
        timeout: timeoutMs,
        signal: ctx.signal,
      });
      return {
        success: exitCode === 0,
        data: { stdout, stderr, exitCode },
        error: exitCode !== 0 ? (stderr || `Exit code ${exitCode}`) : undefined,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        data: { stdout: '', stderr: '', exitCode: 1 },
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
