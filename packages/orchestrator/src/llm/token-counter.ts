import { getEncoding, type Tiktoken } from 'js-tiktoken';

const MODEL_ENCODING_MAP: Record<string, string> = {
  'gpt-5': 'o200k_base',
  'gpt-5.2': 'o200k_base',
  'gpt-4.1': 'o200k_base',
  'gpt-4o': 'o200k_base',
  'gpt-4o-mini': 'o200k_base',
  'gpt-4': 'cl100k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  'o1': 'o200k_base',
  'o1-mini': 'o200k_base',
  'o1-preview': 'o200k_base',
  'o3-mini': 'o200k_base',
};

const ANTHROPIC_CHARS_PER_TOKEN = 3.5;
const DEFAULT_CHARS_PER_TOKEN = 4;

const encodingCache = new Map<string, Tiktoken>();

function getOrCreateEncoding(name: string): Tiktoken {
  let enc = encodingCache.get(name);
  if (!enc) {
    enc = getEncoding(name as Parameters<typeof getEncoding>[0]);
    encodingCache.set(name, enc);
  }
  return enc;
}

export function getEncodingForModel(model: string): string {
  const lower = model.toLowerCase();

  for (const [key, enc] of Object.entries(MODEL_ENCODING_MAP)) {
    if (lower.startsWith(key)) return enc;
  }

  if (lower.includes('claude') || lower.includes('anthropic')) {
    return 'anthropic-approximation';
  }

  if (lower.includes('gemini')) {
    return 'gemini-approximation';
  }

  return 'char-approximation';
}

export function countTokens(text: string, model: string): number {
  if (!text) return 0;

  const encoding = getEncodingForModel(model);

  if (encoding === 'anthropic-approximation') {
    return Math.ceil(text.length / ANTHROPIC_CHARS_PER_TOKEN);
  }

  if (encoding === 'gemini-approximation') {
    return Math.ceil(text.length / DEFAULT_CHARS_PER_TOKEN);
  }

  if (encoding === 'char-approximation') {
    return Math.ceil(text.length / DEFAULT_CHARS_PER_TOKEN);
  }

  try {
    const enc = getOrCreateEncoding(encoding);
    return enc.encode(text).length;
  } catch {
    return Math.ceil(text.length / DEFAULT_CHARS_PER_TOKEN);
  }
}

export class TokenCounter {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  count(text: string): number {
    return countTokens(text, this.model);
  }

  getEncoding(): string {
    return getEncodingForModel(this.model);
  }
}
