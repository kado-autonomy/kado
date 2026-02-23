import * as path from 'path';

export const CRITICAL_PATHS = ['.git', 'node_modules', '.env'];

export class FileSystemGuard {
  private projectPath: string;
  private allowedPaths: Set<string>;

  constructor(projectPath: string, allowedPaths: string[] = []) {
    this.projectPath = this.normalizePath(projectPath);
    this.allowedPaths = new Set([this.projectPath, ...allowedPaths.map((p) => this.normalizePath(p))]);
  }

  normalizePath(p: string): string {
    try {
      return path.resolve(p);
    } catch {
      return path.resolve(process.cwd(), p);
    }
  }

  isPathWithin(child: string, parent: string): boolean {
    const normalizedChild = this.normalizePath(child);
    const normalizedParent = this.normalizePath(parent);
    const relative = path.relative(normalizedParent, normalizedChild);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  private isAllowedPath(targetPath: string): boolean {
    const normalized = this.normalizePath(targetPath);
    for (const allowed of this.allowedPaths) {
      if (this.isPathWithin(normalized, allowed)) {
        return true;
      }
    }
    return false;
  }

  private isCriticalPath(targetPath: string): boolean {
    const normalized = this.normalizePath(targetPath);
    for (const critical of CRITICAL_PATHS) {
      if (normalized.includes(path.sep + critical + path.sep) || normalized.endsWith(path.sep + critical)) {
        return true;
      }
    }
    return false;
  }

  validateRead(pathToCheck: string): boolean {
    return this.isAllowedPath(pathToCheck);
  }

  validateWrite(pathToCheck: string): boolean {
    return this.isPathWithin(this.normalizePath(pathToCheck), this.projectPath);
  }

  validateDelete(pathToCheck: string): boolean {
    const normalized = this.normalizePath(pathToCheck);
    if (!this.isPathWithin(normalized, this.projectPath)) {
      return false;
    }
    return !this.isCriticalPath(pathToCheck);
  }
}
