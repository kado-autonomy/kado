import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface AuditEntry {
  id: string;
  timestamp: number;
  agentId: string;
  action: string;
  resource: string;
  result: 'allowed' | 'denied' | 'error';
  details?: Record<string, unknown>;
}

export interface AuditFilter {
  agentId?: string;
  action?: string;
  startDate?: number;
  endDate?: number;
  result?: 'allowed' | 'denied' | 'error';
}

export class AuditLogger {
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = logPath;
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
  }

  async log(entry: AuditEntry): Promise<void> {
    await this.ensureDir();
    const record = {
      ...entry,
      id: entry.id ?? randomUUID(),
      timestamp: entry.timestamp ?? Date.now(),
    };
    const line = JSON.stringify(record) + '\n';
    await fs.appendFile(this.logPath, line);
  }

  async getEntries(filter?: AuditFilter): Promise<AuditEntry[]> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      let entries: AuditEntry[] = lines.map((line) => JSON.parse(line) as AuditEntry);

      if (filter) {
        if (filter.agentId) {
          entries = entries.filter((e) => e.agentId === filter.agentId);
        }
        if (filter.action) {
          entries = entries.filter((e) => e.action === filter.action);
        }
        if (filter.startDate !== undefined) {
          entries = entries.filter((e) => e.timestamp >= filter.startDate!);
        }
        if (filter.endDate !== undefined) {
          entries = entries.filter((e) => e.timestamp <= filter.endDate!);
        }
        if (filter.result) {
          entries = entries.filter((e) => e.result === filter.result);
        }
      }

      return entries.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.writeFile(this.logPath, '');
    } catch {
      await this.ensureDir();
      await fs.writeFile(this.logPath, '');
    }
  }
}
