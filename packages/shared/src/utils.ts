export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      id += '-';
    } else if (i === 14) {
      id += '4';
    } else {
      id += hex[Math.floor(Math.random() * 16)];
    }
  }
  return id;
}

export function timestamp(): number {
  return Date.now();
}

export function normalizePath(p: string): string {
  const normalized = p.replace(/\\/g, '/').replace(/\/+/g, '/');
  return normalized.endsWith('/') && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
