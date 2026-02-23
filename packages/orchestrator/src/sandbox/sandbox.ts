import { spawn } from 'child_process';
import { CommandFilter } from './command-filter.js';
import { FileSystemGuard } from './fs-guard.js';

export interface SandboxConfig {
  projectPath: string;
  allowedPaths: string[];
  blockedCommands: string[];
  networkAllowed: boolean;
  timeout?: number;
  maxMemory?: number;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  killed: boolean;
}

export interface SandboxExecuteOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
}

export class SandboxedExecutor {
  private config: SandboxConfig;
  private commandFilter: CommandFilter;
  private fsGuard: FileSystemGuard;

  constructor(config: SandboxConfig) {
    this.config = {
      timeout: 30000,
      maxMemory: 512 * 1024 * 1024,
      ...config,
    };
    this.commandFilter = new CommandFilter(this.config.blockedCommands);
    this.fsGuard = new FileSystemGuard(this.config.projectPath, this.config.allowedPaths);
  }

  async execute(
    command: string,
    options?: SandboxExecuteOptions
  ): Promise<SandboxResult> {
    const validation = this.commandFilter.validate(command);
    if (!validation.allowed) {
      return {
        stdout: '',
        stderr: validation.reason ?? 'Command blocked',
        exitCode: -1,
        duration: 0,
        killed: false,
      };
    }

    const cwd = options?.cwd ?? this.config.projectPath;
    const normalizedCwd = this.fsGuard.normalizePath(cwd);
    if (!this.fsGuard.isPathWithin(normalizedCwd, this.config.projectPath)) {
      const allowed = this.config.allowedPaths.some((p) =>
        this.fsGuard.isPathWithin(normalizedCwd, p)
      );
      if (!allowed) {
        return {
          stdout: '',
          stderr: 'Working directory not within allowed paths',
          exitCode: -1,
          duration: 0,
          killed: false,
        };
      }
    }

    const timeout = options?.timeout ?? this.config.timeout ?? 30000;
    const env = { ...process.env, ...options?.env };
    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn(command, [], {
        cwd: normalizedCwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        killed = true;
        child.kill('SIGKILL');
      }, timeout);

      child.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          exitCode: code ?? (signal ? -1 : 0),
          duration,
          killed,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        resolve({
          stdout,
          stderr: err.message,
          exitCode: -1,
          duration,
          killed: false,
        });
      });
    });
  }

}
