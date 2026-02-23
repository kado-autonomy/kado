import { watch } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'eventemitter3';

const IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
]);

const DEBOUNCE_MS = 300;

export interface FileWatcherEvents {
  change: (filePath: string) => void;
  add: (filePath: string) => void;
  delete: (filePath: string) => void;
}

export class FileWatcher extends EventEmitter<FileWatcherEvents> {
  private watcher: ReturnType<typeof watch> | null = null;
  private pending = new Map<string, { type: 'change' | 'add' | 'delete'; timer: ReturnType<typeof setTimeout> }>();

  constructor(private projectPath: string) {
    super();
  }

  start(): void {
    if (this.watcher) return;
    this.watcher = watch(this.projectPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const fullPath = join(this.projectPath, filename);
      const parts = filename.split(/[/\\]/);
      if (parts.some((p) => IGNORE.has(p))) return;
      this.debounce(fullPath, eventType === 'rename' ? 'add' : 'change');
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const [, { timer }] of this.pending) {
      clearTimeout(timer);
    }
    this.pending.clear();
  }

  private debounce(filePath: string, type: 'change' | 'add' | 'delete'): void {
    const key = `${type}:${filePath}`;
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
    }
    const timer = setTimeout(() => {
      this.pending.delete(key);
      if (type === 'change') {
        this.emit('change', filePath);
      } else if (type === 'add') {
        this.emit('add', filePath);
      } else {
        this.emit('delete', filePath);
      }
    }, DEBOUNCE_MS);
    this.pending.set(key, { type, timer });
  }
}
