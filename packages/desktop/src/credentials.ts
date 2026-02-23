import { readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2 as pbkdf2Cb, createHash } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2Cb);

const KADO_DIR = path.join(os.homedir(), ".kado");
export const CREDENTIALS_DIR = path.join(KADO_DIR, "credentials");
export const SETTINGS_PATH = path.join(KADO_DIR, "settings.json");

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function getMachineId(): string {
  const cpu = os.cpus()[0];
  const raw = os.hostname() + os.arch() + (cpu?.model ?? "");
  return createHash("sha256").update(raw).digest("hex");
}

let derivedKey: Buffer | null = null;

async function getEncryptionKey(): Promise<Buffer> {
  if (derivedKey) return derivedKey;
  const saltPath = path.join(CREDENTIALS_DIR, ".salt");
  await ensureDir(CREDENTIALS_DIR);
  let salt: Buffer;
  try {
    salt = await readFile(saltPath);
  } catch {
    salt = randomBytes(16);
    await writeFile(saltPath, salt);
  }
  derivedKey = (await pbkdf2Async(getMachineId(), salt, 100000, 32, "sha256")) as Buffer;
  return derivedKey;
}

export async function encryptValue(value: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export async function decryptValue(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Buffer.from(encrypted, "base64");
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const data = combined.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

export async function readCredential(key: string): Promise<string | null> {
  try {
    const safeName = Buffer.from(key).toString("base64url");
    const filePath = path.join(CREDENTIALS_DIR, `${safeName}.enc`);
    const encrypted = await readFile(filePath, "utf-8");
    return await decryptValue(encrypted);
  } catch {
    return null;
  }
}

export async function readSettings<T extends Record<string, unknown>>(fallback: T): Promise<T> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}
