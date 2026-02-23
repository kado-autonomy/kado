import { randomBytes, pbkdf2, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

export class EncryptionService {
  generateSalt(): Buffer {
    return randomBytes(SALT_LENGTH);
  }

  generateIV(): Buffer {
    return randomBytes(IV_LENGTH);
  }

  async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return pbkdf2Async(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256') as Promise<Buffer>;
  }

  async encrypt(data: string, key: Buffer): Promise<string> {
    const iv = this.generateIV();
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  async decrypt(encrypted: string, key: Buffer): Promise<string> {
    const combined = Buffer.from(encrypted, 'base64');
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final('utf8');
  }
}
