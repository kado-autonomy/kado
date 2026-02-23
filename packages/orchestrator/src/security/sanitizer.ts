import * as path from 'path';

const SHELL_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]<>]/g,
  /\$\{[^}]+\}/g,
  /`[^`]*`/g,
  /\$\([^)]*\)/g,
  /\n/g,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g,
  /\/\.\./g,
  /\.\.\//g,
];

const CONTROL_CHARS = /[\x00-\x1f\x7f-\x9f]/g;

const API_KEY_PATTERNS: RegExp[] = [
  /^sk-[a-zA-Z0-9]{20,}$/,
  /^sk-ant-[a-zA-Z0-9\-]{20,}$/,
  /^[a-zA-Z0-9]{32,}$/,
];

export class InputSanitizer {
  sanitizeCommand(cmd: string): string {
    let sanitized = cmd;
    for (const pattern of SHELL_INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    return sanitized.trim();
  }

  sanitizePath(inputPath: string): string {
    let sanitized = inputPath;
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    return path.normalize(sanitized).replace(/^(\.\.(\/|\\|$))+/, '');
  }

  sanitizeUserInput(input: string): string {
    return input.replace(CONTROL_CHARS, '').trim();
  }

  validateApiKey(key: string): boolean {
    if (!key || key.length < 20) return false;
    return API_KEY_PATTERNS.some((p) => p.test(key));
  }
}
