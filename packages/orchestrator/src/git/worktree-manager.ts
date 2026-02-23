import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execGit, isGitRepo, getGitRoot } from './git-utils.js';

export interface WorktreeDiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  original: string;
  modified: string;
  additions: number;
  deletions: number;
}

export interface WorktreeDiffResult {
  taskId: string;
  branch: string;
  worktreePath: string;
  files: WorktreeDiffFile[];
}

interface WorktreeEntry {
  taskId: string;
  branch: string;
  worktreePath: string;
  projectPath: string;
  gitRoot: string;
}

export class WorktreeManager {
  private worktrees = new Map<string, WorktreeEntry>();
  private baseDir: string;

  constructor(private projectPath: string) {
    this.baseDir = path.join(os.tmpdir(), 'kado-worktrees');
  }

  async createWorktree(taskId: string): Promise<string> {
    const isRepo = await isGitRepo(this.projectPath);
    if (!isRepo) throw new Error('Project is not a git repository');

    const gitRoot = await getGitRoot(this.projectPath);
    await fs.mkdir(this.baseDir, { recursive: true });

    const worktreePath = path.join(this.baseDir, taskId);
    const branch = `kado/task-${taskId.slice(0, 8)}`;

    const { exitCode, stderr } = await execGit(
      ['worktree', 'add', '-b', branch, worktreePath, 'HEAD'],
      gitRoot,
    );
    if (exitCode !== 0) {
      throw new Error(`Failed to create worktree: ${stderr}`);
    }

    this.worktrees.set(taskId, {
      taskId,
      branch,
      worktreePath,
      projectPath: this.projectPath,
      gitRoot,
    });

    return worktreePath;
  }

  getWorktreePath(taskId: string): string | undefined {
    return this.worktrees.get(taskId)?.worktreePath;
  }

  getBranch(taskId: string): string | undefined {
    return this.worktrees.get(taskId)?.branch;
  }

  async getDiff(taskId: string): Promise<WorktreeDiffResult> {
    const entry = this.worktrees.get(taskId);
    if (!entry) throw new Error(`No worktree found for task ${taskId}`);

    const { stdout: statusOutput } = await execGit(
      ['status', '--porcelain'],
      entry.worktreePath,
    );

    const files: WorktreeDiffFile[] = [];

    if (!statusOutput.trim()) {
      return { taskId, branch: entry.branch, worktreePath: entry.worktreePath, files };
    }

    const lines = statusOutput.split('\n').filter(Boolean);
    for (const line of lines) {
      const statusCode = line.slice(0, 2).trim();
      const filePath = line.slice(3);

      let status: WorktreeDiffFile['status'];
      if (statusCode === 'A' || statusCode === '??') {
        status = 'added';
      } else if (statusCode === 'D') {
        status = 'deleted';
      } else {
        status = 'modified';
      }

      // Stage untracked files so we can diff them
      if (statusCode === '??') {
        await execGit(['add', filePath], entry.worktreePath);
      }

      let original = '';
      let modified = '';

      if (status === 'deleted') {
        const { stdout } = await execGit(['show', `HEAD:${filePath}`], entry.worktreePath);
        original = stdout;
      } else if (status === 'added') {
        const absPath = path.join(entry.worktreePath, filePath);
        modified = await fs.readFile(absPath, 'utf-8').catch(() => '');
      } else {
        const { stdout: origContent } = await execGit(
          ['show', `HEAD:${filePath}`],
          entry.worktreePath,
        );
        original = origContent;
        const absPath = path.join(entry.worktreePath, filePath);
        modified = await fs.readFile(absPath, 'utf-8').catch(() => '');
      }

      const origLines = original ? original.split('\n').length : 0;
      const modLines = modified ? modified.split('\n').length : 0;

      files.push({
        path: filePath,
        status,
        original,
        modified,
        additions: Math.max(0, modLines - origLines) || (modified && !original ? modLines : 0),
        deletions: Math.max(0, origLines - modLines) || (original && !modified ? origLines : 0),
      });
    }

    return { taskId, branch: entry.branch, worktreePath: entry.worktreePath, files };
  }

  async acceptChanges(taskId: string): Promise<void> {
    const entry = this.worktrees.get(taskId);
    if (!entry) throw new Error(`No worktree found for task ${taskId}`);

    const diff = await this.getDiff(taskId);

    for (const file of diff.files) {
      const destPath = path.join(entry.projectPath, file.path);

      if (file.status === 'deleted') {
        await fs.unlink(destPath).catch(() => {});
      } else {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        const srcPath = path.join(entry.worktreePath, file.path);
        await fs.copyFile(srcPath, destPath);
      }
    }

    await this.removeWorktree(taskId);
  }

  async rejectChanges(taskId: string): Promise<void> {
    await this.removeWorktree(taskId);
  }

  async cleanupAll(): Promise<void> {
    const taskIds = [...this.worktrees.keys()];
    for (const taskId of taskIds) {
      await this.removeWorktree(taskId).catch(() => {});
    }
  }

  private async removeWorktree(taskId: string): Promise<void> {
    const entry = this.worktrees.get(taskId);
    if (!entry) return;

    await execGit(['worktree', 'remove', entry.worktreePath, '--force'], entry.gitRoot);
    await execGit(['branch', '-D', entry.branch], entry.gitRoot);

    this.worktrees.delete(taskId);
  }
}
