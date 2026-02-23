import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface BackupEntry {
  id: string;
  originalPath: string;
  backupPath: string;
  timestamp: number;
  size: number;
}

export class RollbackManager {
  private backupDir: string;
  private projectPath: string;

  constructor(projectPath: string, backupDir?: string) {
    this.projectPath = path.resolve(projectPath);
    this.backupDir = backupDir ?? path.join(this.projectPath, '.kado', 'backups');
  }

  async backup(filePath: string): Promise<string> {
    const resolved = path.resolve(this.projectPath, filePath);
    const stat = await fs.stat(resolved);
    const id = randomUUID();
    const timestamp = Date.now();
    const ext = path.extname(resolved);
    const base = path.basename(resolved, ext);
    const backupFileName = `${base}-${timestamp}${ext}`;
    const backupPath = path.join(this.backupDir, id, backupFileName);

    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(resolved, backupPath);

    const metaPath = path.join(this.backupDir, id, 'meta.json');
    const meta: BackupEntry = {
      id,
      originalPath: resolved,
      backupPath,
      timestamp,
      size: stat.size,
    };
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

    return id;
  }

  async rollback(backupId: string): Promise<void> {
    const metaPath = path.join(this.backupDir, backupId, 'meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const meta: BackupEntry = JSON.parse(metaContent);
    await fs.copyFile(meta.backupPath, meta.originalPath);
  }

  async getBackupContent(backupId: string): Promise<string> {
    const metaPath = path.join(this.backupDir, backupId, 'meta.json');
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const meta: BackupEntry = JSON.parse(metaContent);
    return fs.readFile(meta.backupPath, 'utf-8');
  }

  async listBackups(filePath?: string): Promise<BackupEntry[]> {
    try {
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });
      const backups: BackupEntry[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const metaPath = path.join(this.backupDir, entry.name, 'meta.json');
        try {
          const content = await fs.readFile(metaPath, 'utf-8');
          const meta: BackupEntry = JSON.parse(content);
          if (filePath) {
            const resolved = path.resolve(this.projectPath, filePath);
            if (meta.originalPath !== resolved && !meta.originalPath.startsWith(resolved + path.sep)) {
              continue;
            }
          }
          backups.push(meta);
        } catch {
          continue;
        }
      }

      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  async cleanOldBackups(maxAge: number): Promise<number> {
    const backups = await this.listBackups();
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    for (const backup of backups) {
      if (backup.timestamp < cutoff) {
        const backupDir = path.join(this.backupDir, backup.id);
        await fs.rm(backupDir, { recursive: true, force: true });
        removed++;
      }
    }

    return removed;
  }
}
