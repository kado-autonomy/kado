import * as fs from 'fs/promises';
import * as path from 'path';
import type { EventBus, DebugLevel } from './event-bus.js';

export interface LogEntry {
  timestamp: number;
  level: DebugLevel;
  source: string;
  message: string;
  data?: unknown;
}

const LEVEL_PRIORITY: Record<DebugLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

function parseLogLevel(value: string | undefined): DebugLevel {
  const normalized = (value ?? 'info').toLowerCase() as DebugLevel;
  return normalized in LEVEL_PRIORITY ? normalized : 'info';
}

export class Logger {
  private minLevel: DebugLevel;
  private logFilePath: string | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private source: string,
    private events?: EventBus,
    options?: { logDir?: string; minLevel?: DebugLevel }
  ) {
    this.minLevel = options?.minLevel ?? parseLogLevel(process.env['KADO_LOG_LEVEL']);

    if (options?.logDir) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFilePath = path.join(options.logDir, `kado-${timestamp}.log`);
    }
  }

  trace(message: string, data?: unknown): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  child(childSource: string): Logger {
    return new Logger(`${this.source}:${childSource}`, this.events, {
      minLevel: this.minLevel,
      logDir: this.logFilePath ? path.dirname(this.logFilePath) : undefined,
    });
  }

  private log(level: DebugLevel, message: string, data?: unknown): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    this.events?.emitDebug(level, this.source, message, data);

    if (this.logFilePath) {
      const entry: LogEntry = {
        timestamp: Date.now(),
        level,
        source: this.source,
        message,
        ...(data !== undefined ? { data } : {}),
      };
      this.writeQueue = this.writeQueue.then(() => this.appendToFile(entry));
    }
  }

  private async appendToFile(entry: LogEntry): Promise<void> {
    if (!this.logFilePath) return;
    try {
      const dir = path.dirname(this.logFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(this.logFilePath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // swallow file write errors to avoid cascading failures
    }
  }
}
