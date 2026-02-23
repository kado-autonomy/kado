export const BLOCKED_COMMANDS = [
  'rm -rf /',
  'sudo',
  'mkfs',
  'dd if=',
  'chmod 777',
  ':(){:|:&};:',
  'shutdown',
  'reboot',
];

export const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\/\s*$/,
  /rm\s+-rf\s+\/\s+\S/,
  /sudo\s+/i,
  /mkfs\.\w+/,
  /dd\s+if=/,
  /chmod\s+777/,
  /:\(\)\s*\{\s*:\|:\&\s*\}\s*;\s*:/,
  /shutdown\s+/i,
  /reboot\s*$/i,
  /\|\s*bash\s*$/,
  /\|\s*sh\s*$/,
  />\s*\/dev\/sd[a-z]/,
  />\s*\/dev\/null\s*&\s*$/,
];

export interface CommandFilterResult {
  allowed: boolean;
  reason?: string;
}

export class CommandFilter {
  private blockedCommands: Set<string>;
  private blockedPatterns: RegExp[];

  constructor(
    blockedCommands: string[] = BLOCKED_COMMANDS,
    blockedPatterns: RegExp[] = BLOCKED_PATTERNS
  ) {
    this.blockedCommands = new Set(blockedCommands.map((c) => c.toLowerCase()));
    this.blockedPatterns = blockedPatterns;
  }

  validate(command: string): CommandFilterResult {
    const trimmed = command.trim();
    const lower = trimmed.toLowerCase();

    for (const blocked of this.blockedCommands) {
      if (lower.includes(blocked) || lower.startsWith(blocked)) {
        return { allowed: false, reason: `Blocked command: ${blocked}` };
      }
    }

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(trimmed)) {
        return { allowed: false, reason: `Blocked pattern: ${pattern.source}` };
      }
    }

    return { allowed: true };
  }

  sanitize(command: string): string {
    let sanitized = command;

    for (const blocked of this.blockedCommands) {
      const re = new RegExp(blocked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(re, '');
    }

    for (const pattern of this.blockedPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized.replace(/\s+/g, ' ').trim();
  }
}
