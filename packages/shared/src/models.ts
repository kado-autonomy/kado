export type ProviderKind = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface ModelDef {
  id: string;
  displayName: string;
  provider: ProviderKind;
  contextWindow: number;
}

export const MODELS: ModelDef[] = [
  // OpenAI
  { id: 'gpt-5.2',   displayName: 'GPT-5.2',   provider: 'openai', contextWindow: 128_000 },
  { id: 'gpt-5',     displayName: 'GPT-5',      provider: 'openai', contextWindow: 128_000 },
  { id: 'gpt-4.1',   displayName: 'GPT-4.1',    provider: 'openai', contextWindow: 128_000 },
  { id: 'gpt-4o',    displayName: 'GPT-4o',      provider: 'openai', contextWindow: 128_000 },
  { id: 'o3-mini',   displayName: 'o3-mini',     provider: 'openai', contextWindow: 128_000 },

  // Anthropic
  { id: 'claude-sonnet-4-6-20260217', displayName: 'Claude Sonnet 4.6', provider: 'anthropic', contextWindow: 1_000_000 },
  { id: 'claude-opus-4-6-20260205',   displayName: 'Claude Opus 4.6',   provider: 'anthropic', contextWindow: 1_000_000 },
  { id: 'claude-sonnet-4-5-20250514', displayName: 'Claude Sonnet 4.5', provider: 'anthropic', contextWindow: 200_000 },
  { id: 'claude-opus-4-5-20250414',   displayName: 'Claude Opus 4.5',   provider: 'anthropic', contextWindow: 200_000 },

  // Google Gemini
  { id: 'gemini-2.5-pro',       displayName: 'Gemini 2.5 Pro',       provider: 'google', contextWindow: 1_000_000 },
  { id: 'gemini-2.5-flash',     displayName: 'Gemini 2.5 Flash',     provider: 'google', contextWindow: 1_000_000 },
  { id: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite', provider: 'google', contextWindow: 1_000_000 },
];

export const DEFAULT_MODEL_ID = 'gpt-5.2';

export const DEFAULT_MODEL_ORDER = [
  'gpt-5.2',
  'claude-sonnet-4-6-20260217',
  'gemini-2.5-pro',
  'gpt-4.1',
  'claude-opus-4-6-20260205',
];

export function getModelDef(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(provider: ProviderKind): ModelDef[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getDisplayName(id: string): string {
  return getModelDef(id)?.displayName ?? id;
}

export function resolveProvider(modelId: string): ProviderKind {
  const def = getModelDef(modelId);
  if (def) return def.provider;

  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';
  return 'ollama';
}
