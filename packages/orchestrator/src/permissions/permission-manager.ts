import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export type PermissionActionType =
  | 'file-write'
  | 'file-delete'
  | 'shell-execute'
  | 'network-request'
  | 'install-package';

export type PermissionRisk = 'low' | 'medium' | 'high';

export interface PermissionAction {
  type: PermissionActionType;
  description: string;
  resource: string;
  risk: PermissionRisk;
}

export type PermissionDecision = 'allow-always' | 'allow-once' | 'deny';

interface StoredPermission {
  type: PermissionActionType;
  resource: string;
  decision: 'allow-always' | 'deny';
  timestamp: number;
}

interface PermissionsFile {
  projectId: string;
  permissions: StoredPermission[];
}

export interface PermissionManagerEvents {
  'permission-request': (action: PermissionAction, resolve: (decision: PermissionDecision) => void) => void;
}

export class PermissionManager extends EventEmitter {
  private storagePath: string;
  private projectId: string;
  private permissions: Map<string, StoredPermission> = new Map();

  constructor(storagePath: string, projectId: string = 'default') {
    super();
    this.storagePath = storagePath;
    this.projectId = projectId;
  }

  private getFilePath(): string {
    return path.join(this.storagePath, `${this.projectId}-permissions.json`);
  }

  private permissionKey(type: PermissionActionType, resource: string): string {
    return `${type}:${resource}`;
  }

  async load(): Promise<void> {
    try {
      const filePath = this.getFilePath();
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed: PermissionsFile = JSON.parse(data);
      this.permissions.clear();
      for (const p of parsed.permissions ?? []) {
        this.permissions.set(this.permissionKey(p.type, p.resource), p);
      }
    } catch {
      this.permissions.clear();
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    const filePath = this.getFilePath();
    const data: PermissionsFile = {
      projectId: this.projectId,
      permissions: Array.from(this.permissions.values()),
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  checkPermission(action: PermissionAction): PermissionDecision | null {
    const key = this.permissionKey(action.type, action.resource);
    const stored = this.permissions.get(key);
    if (!stored) return null;
    if (stored.decision === 'deny') return 'deny';
    if (stored.decision === 'allow-always') return 'allow-always';
    return null;
  }

  async requestPermission(action: PermissionAction): Promise<PermissionDecision> {
    const existing = this.checkPermission(action);
    if (existing === 'allow-always') return 'allow-always';
    if (existing === 'deny') return 'deny';

    return new Promise((resolve) => {
      this.emit('permission-request', action, (decision: PermissionDecision) => {
        if (decision === 'allow-always') {
          this.permissions.set(this.permissionKey(action.type, action.resource), {
            type: action.type,
            resource: action.resource,
            decision: 'allow-always',
            timestamp: Date.now(),
          });
          this.save();
        } else if (decision === 'deny') {
          this.permissions.set(this.permissionKey(action.type, action.resource), {
            type: action.type,
            resource: action.resource,
            decision: 'deny',
            timestamp: Date.now(),
          });
          this.save();
        }
        resolve(decision);
      });
    });
  }

  revokePermission(type: PermissionActionType, resource: string): void {
    this.permissions.delete(this.permissionKey(type, resource));
    this.save();
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }
}
