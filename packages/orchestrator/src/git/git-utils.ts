import { execFile } from 'child_process';

export interface GitExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function execGit(args: string[], cwd: string): Promise<GitExecResult> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: 30_000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.trimEnd() ?? '',
        stderr: stderr?.trimEnd() ?? '',
        exitCode: error?.code != null ? (typeof error.code === 'number' ? error.code : 1) : 0,
      });
    });
  });
}

export async function isGitRepo(dir: string): Promise<boolean> {
  const { exitCode } = await execGit(['rev-parse', '--is-inside-work-tree'], dir);
  return exitCode === 0;
}

export async function getGitRoot(dir: string): Promise<string> {
  const { stdout, exitCode } = await execGit(['rev-parse', '--show-toplevel'], dir);
  if (exitCode !== 0) {
    throw new Error(`Not a git repository: ${dir}`);
  }
  return stdout;
}

export async function getCurrentBranch(dir: string): Promise<string> {
  const { stdout, exitCode } = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
  if (exitCode !== 0) throw new Error('Failed to get current branch');
  return stdout;
}

export async function getHeadSha(dir: string): Promise<string> {
  const { stdout, exitCode } = await execGit(['rev-parse', 'HEAD'], dir);
  if (exitCode !== 0) throw new Error('Failed to get HEAD sha');
  return stdout;
}
