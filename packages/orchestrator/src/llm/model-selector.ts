import type { LLMProvider } from './provider.js';

export class ModelSelector {
  private providers: LLMProvider[] = [];
  private preferredModel: string | null = null;
  private tokenBudget = 0;
  private tokensUsed = 0;

  addProvider(provider: LLMProvider): void {
    if (!this.providers.some((p) => p.modelId === provider.modelId)) {
      this.providers.push(provider);
    }
  }

  selectModel(preference?: string): LLMProvider {
    if (preference) {
      const match = this.providers.find(
        (p) => p.modelId === preference || p.modelId?.startsWith(preference)
      );
      if (match) return match;
    }
    if (this.preferredModel) {
      const match = this.providers.find((p) => p.modelId === this.preferredModel);
      if (match) return match;
    }
    if (this.providers.length === 0) {
      throw new Error('No LLM providers registered');
    }
    const first = this.providers[0];
    if (!first) throw new Error('No LLM providers registered');
    return first;
  }

  setPreferredModel(modelId: string | null): void {
    this.preferredModel = modelId;
  }

  setTokenBudget(budget: number): void {
    this.tokenBudget = budget;
    this.tokensUsed = 0;
  }

  recordTokensUsed(count: number): void {
    this.tokensUsed += count;
  }

  getRemainingBudget(): number {
    if (this.tokenBudget <= 0) return Number.POSITIVE_INFINITY;
    return Math.max(0, this.tokenBudget - this.tokensUsed);
  }

  getProviders(): LLMProvider[] {
    return [...this.providers];
  }
}
