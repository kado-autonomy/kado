import { spawn } from 'child_process';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export interface BuildResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  command: string;
}

interface BuildSystem {
  name: string;
  command: string;
  args: string[];
}

export class BuildVerifier {
  async runBuild(projectPath: string): Promise<BuildResult> {
    const buildSystem = await this.detectBuildSystem(projectPath);
    if (!buildSystem) {
      return {
        success: true,
        errors: [],
        warnings: ['No build system detected; skipping build verification'],
        command: 'none',
      };
    }

    const command = `${buildSystem.command} ${buildSystem.args.join(' ')}`.trim();
    const output = await this.executeBuild(projectPath, buildSystem);
    const { errors, warnings } = this.parseOutput(output, buildSystem.name);

    return {
      success: errors.length === 0,
      errors,
      warnings,
      command,
    };
  }

  private async detectBuildSystem(projectPath: string): Promise<BuildSystem | null> {
    if (await this.fileExists(join(projectPath, 'package.json'))) {
      try {
        const raw = await readFile(join(projectPath, 'package.json'), 'utf-8');
        const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
        if (pkg.scripts?.['build']) {
          return { name: 'npm', command: 'npm', args: ['run', 'build'] };
        }
      } catch { /* ignore malformed package.json */ }
    }

    if (await this.fileExists(join(projectPath, 'Makefile'))) {
      return { name: 'make', command: 'make', args: [] };
    }

    if (await this.fileExists(join(projectPath, 'setup.py'))) {
      return { name: 'python', command: 'python', args: ['setup.py', 'build'] };
    }

    if (await this.fileExists(join(projectPath, 'Cargo.toml'))) {
      return { name: 'cargo', command: 'cargo', args: ['build'] };
    }

    if (await this.fileExists(join(projectPath, 'go.mod'))) {
      return { name: 'go', command: 'go', args: ['build', './...'] };
    }

    return null;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private executeBuild(projectPath: string, buildSystem: BuildSystem): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(buildSystem.command, buildSystem.args, {
        cwd: projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000,
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', () => resolve(stdout + '\n' + stderr));
      proc.on('error', reject);
    });
  }

  private parseOutput(output: string, system: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (this.isErrorLine(lower, system)) {
        errors.push(line.trim());
      } else if (this.isWarningLine(lower)) {
        warnings.push(line.trim());
      }
    }

    return { errors, warnings };
  }

  private isErrorLine(lower: string, system: string): boolean {
    if (lower.includes('error') && !lower.includes('0 error')) {
      if (system === 'npm' && (lower.includes('err!') || lower.includes('error ts') || lower.includes(': error '))) {
        return true;
      }
      if (system === 'make' && lower.includes('error:')) return true;
      if (system === 'cargo' && lower.startsWith('error')) return true;
      if (system === 'go' && lower.includes(': ')) return true;
      if (system === 'python' && (lower.includes('error:') || lower.includes('syntaxerror'))) return true;
      if (lower.includes(': error') || lower.includes('error:')) return true;
    }
    return false;
  }

  private isWarningLine(lower: string): boolean {
    return lower.includes('warning') && !lower.includes('0 warning');
  }
}
