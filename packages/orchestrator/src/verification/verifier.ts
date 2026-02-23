import type { LLMProvider } from '../llm/provider.js';
import type { EventBus } from '../core/event-bus.js';
import type { ExecutionResult, Plan, VerificationResult } from '../planning/types.js';
import { TestVerifier } from './test-runner.js';
import { LintChecker } from './lint-checker.js';
import { BuildVerifier } from './build-verifier.js';

export class Verifier {
  private testVerifier = new TestVerifier();
  private lintChecker = new LintChecker();
  private buildVerifier = new BuildVerifier();

  constructor(
    private projectPath: string,
    private llmProvider: LLMProvider,
    private events?: EventBus
  ) {}

  async verify(
    results: ExecutionResult[],
    plan: Plan
  ): Promise<VerificationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let canRetry = true;

    const failedResults = results.filter((r) => !r.success);
    if (failedResults.length > 0) {
      const total = results.length;
      issues.push(`${failedResults.length} of ${total} execution step(s) failed`);
      for (const r of failedResults) {
        const step = plan.steps.find((s) => s.id === r.stepId);
        if (step) {
          issues.push(`Step "${step.description}" (${step.toolName}): ${r.error ?? 'unknown error'}`);
        }
      }
      const allFailuresAreInfrastructural = failedResults.every((r) => {
        const err = r.error ?? '';
        return err.includes('fetch failed') || err.includes('unavailable');
      });
      if (allFailuresAreInfrastructural) {
        canRetry = false;
      }

      const allFailuresAreDiscovery = failedResults.every((r) => {
        const err = r.error ?? '';
        return err.includes('discovery steps found no matching')
          || err.includes('dependency results insufficient')
          || err.includes('no homepage entry file')
          || err.includes('returned no');
      });
      const hasEmptySearches = results.some((r) => r.emptyResult === true);
      if (allFailuresAreDiscovery || (hasEmptySearches && failedResults.length === results.length - results.filter((r) => r.emptyResult).length)) {
        canRetry = false;
        issues.push('The requested target could not be found in the codebase — retrying is unlikely to help');
      }
      this.events?.emitDebug('warn', 'verifier', `${failedResults.length}/${total} steps failed before verification checks`);
    }

    const modifiedFiles = this.extractModifiedFiles(results, plan);

    this.events?.emitVerificationProgress('build', 'running');
    this.events?.emitDebug('info', 'verifier', 'Running build verification');
    try {
      const buildResult = await this.buildVerifier.runBuild(this.projectPath);
      if (!buildResult.success) {
        for (const e of buildResult.errors) {
          issues.push(`Build error (${buildResult.command}): ${e}`);
        }
        this.events?.emitVerificationProgress('build', 'failed', buildResult.errors.join('; '));
      } else {
        this.events?.emitVerificationProgress('build', 'passed');
      }
      for (const w of buildResult.warnings) {
        suggestions.push(`Build warning: ${w}`);
      }
    } catch (err) {
      issues.push('Build verification failed unexpectedly');
      this.events?.emitVerificationProgress('build', 'failed', err instanceof Error ? err.message : 'unexpected error');
    }

    if (modifiedFiles.length > 0) {
      this.events?.emitVerificationProgress('lint', 'running');
      this.events?.emitDebug('info', 'verifier', `Running lint check on ${modifiedFiles.length} file(s)`);
      try {
        const lintResult = await this.lintChecker.checkLint(modifiedFiles);
        if (!lintResult.clean) {
          for (const e of lintResult.errors) {
            issues.push(`${e.file}: ${e.message}`);
          }
          this.events?.emitVerificationProgress('lint', 'failed', `${lintResult.errors.length} error(s)`);
        } else {
          this.events?.emitVerificationProgress('lint', 'passed');
        }
      } catch {
        issues.push('Lint check failed (eslint may not be configured)');
        this.events?.emitVerificationProgress('lint', 'failed', 'eslint may not be configured');
      }
    }

    const hasTestFiles = modifiedFiles.some(
      (f) => f.includes('test') || f.includes('spec')
    );
    if (hasTestFiles) {
      this.events?.emitVerificationProgress('test', 'running');
      this.events?.emitDebug('info', 'verifier', 'Running test suite');
      try {
        const testResult = await this.testVerifier.runTests(this.projectPath);
        if (testResult.failed > 0) {
          issues.push(`${testResult.failed} test(s) failed`);
          this.events?.emitVerificationProgress(
            'test',
            'failed',
            `${testResult.passed} passed, ${testResult.failed} failed of ${testResult.total} total`
          );
        } else {
          this.events?.emitVerificationProgress(
            'test',
            'passed',
            `${testResult.passed} passed of ${testResult.total} total`
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        issues.push(msg);
        this.events?.emitVerificationProgress('test', 'failed', msg);
      }
    }

    if (issues.length > 0 && modifiedFiles.length > 3) {
      this.events?.emitDebug('info', 'verifier', 'Requesting LLM review of issues');
      const review = await this.llmReview(results, plan, issues);
      suggestions.push(...review);
    }

    this.events?.emitDebug('info', 'verifier', `Verification complete: ${issues.length === 0 ? 'passed' : `${issues.length} issue(s)`}`);

    return {
      passed: issues.length === 0,
      issues,
      suggestions,
      canRetry: canRetry && issues.length > 0,
    };
  }

  private static readonly FILE_MODIFYING_TOOLS = new Set([
    'edit', 'write', 'file_edit', 'file_write',
  ]);

  private extractModifiedFiles(results: ExecutionResult[], plan: Plan): string[] {
    const files: string[] = [];
    for (const r of results) {
      if (!r.success) continue;
      const step = plan.steps.find((s) => s.id === r.stepId);
      if (step && Verifier.FILE_MODIFYING_TOOLS.has(step.toolName)) {
        const path = step.toolArgs['path'] ?? step.toolArgs['file'];
        if (typeof path === 'string') files.push(path);
      }
    }
    return files;
  }

  private async llmReview(
    _results: ExecutionResult[],
    plan: Plan,
    issues: string[]
  ): Promise<string[]> {
    const prompt = `Review these verification issues and suggest fixes. Issues: ${issues.join('; ')}. Plan had ${plan.steps.length} steps. Respond with 1-3 short suggestions, one per line.`;
    try {
      const response = await this.llmProvider.complete(
        [{ role: 'user', content: prompt }],
        { maxTokens: 256 }
      );
      return response.content
        .split('\n')
        .map((s) => s.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
