import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { EncryptionService } from './encryption.js';

function getMachineId(): string {
  const platform = os.platform();
  let id = '';
  if (platform === 'darwin') {
    const cpu = os.cpus()[0];
    id = os.hostname() + os.arch() + (cpu?.model ?? '');
  } else if (platform === 'win32') {
    id = process.env.COMPUTERNAME ?? os.hostname();
  } else {
    id = os.hostname() + os.arch();
  }
  return createHash('sha256').update(id).digest('hex');
}

export class CredentialStore {
  private storagePath: string;
  private encryption: EncryptionService;
  private key: Buffer | null = null;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? path.join(os.homedir(), '.kado', 'credentials');
    this.encryption = new EncryptionService();
  }

  private async getKey(): Promise<Buffer> {
    if (this.key) return this.key;
    const machineId = getMachineId();
    const saltPath = path.join(this.storagePath, '.salt');
    let salt: Buffer;
    try {
      const saltData = await fs.readFile(saltPath);
      salt = Buffer.from(saltData);
    } catch {
      salt = this.encryption.generateSalt();
      await fs.mkdir(this.storagePath, { recursive: true });
      await fs.writeFile(saltPath, salt);
    }
    this.key = await this.encryption.deriveKey(machineId, salt);
    return this.key;
  }

  private getFilePath(key: string): string {
    const safe = Buffer.from(key).toString('base64url');
    return path.join(this.storagePath, `${safe}.enc`);
  }

  async store(key: string, value: string): Promise<void> {
    const encKey = await this.getKey();
    const encrypted = await this.encryption.encrypt(value, encKey);
    await fs.mkdir(this.storagePath, { recursive: true });
    await fs.writeFile(this.getFilePath(key), encrypted);
  }

  async retrieve(key: string): Promise<string | null> {
    try {
      const encrypted = await fs.readFile(this.getFilePath(key), 'utf-8');
      const encKey = await this.getKey();
      return await this.encryption.decrypt(encrypted, encKey);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(key));
    } catch {
      return;
    }
  }

  async listKeys(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storagePath);
      return files
        .filter((f) => f.endsWith('.enc'))
        .map((f) => {
          const base = f.slice(0, -4);
          return Buffer.from(base, 'base64url').toString('utf-8');
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
