import { spawn } from 'child_process';

export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  output: string;
  duration: number;
}

export class TestVerifier {
  async runTests(
    projectPath: string,
    testPattern?: string
  ): Promise<TestResult> {
    const start = Date.now();
    const output = await this.runTestCommand(projectPath, testPattern);
    const duration = Date.now() - start;
    const { passed, failed, total } = this.parseOutput(output);
    return { passed, failed, total, output, duration };
  }

  private runTestCommand(
    projectPath: string,
    _testPattern?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('npm', ['test'], {
        cwd: projectPath,
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

  private parseOutput(output: string): { passed: number; failed: number; total: number } {
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const totalMatch = output.match(/(\d+)\s+total/);
    const testsMatch = output.match(/(\d+)\s+tests?/);

    const passed = parseInt(passedMatch?.[1] ?? '0', 10);
    const failed = parseInt(failedMatch?.[1] ?? '0', 10);
    const total =
      parseInt(totalMatch?.[1] ?? '0', 10) ||
      parseInt(testsMatch?.[1] ?? '0', 10) ||
      passed + failed;

    return { passed, failed, total: total || 1 };
  }
}
