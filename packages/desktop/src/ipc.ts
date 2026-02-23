import { ipcMain } from "electron";
import { readdir, readFile, writeFile, stat, mkdir, unlink, rename } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { dialog } from "electron";
import * as path from "path";
import * as bridge from "./orchestrator-bridge";
import { encryptValue, decryptValue, ensureDir, SETTINGS_PATH, CREDENTIALS_DIR } from "./credentials";

const execAsync = promisify(exec);

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function success<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

function failure(error: string): IpcResult<never> {
  return { success: false, error };
}

export function setupIpcHandlers(): void {
  ipcMain.handle("fs:readDir", async (_, path: string): Promise<IpcResult<string[]>> => {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return success(entries.map((e) => e.name));
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("fs:readFile", async (_, path: string, encoding?: BufferEncoding): Promise<IpcResult<string | Buffer>> => {
    try {
      const content = await readFile(path, encoding ?? "utf-8");
      return success(content);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("fs:writeFile", async (_, path: string, data: string | Buffer): Promise<IpcResult<void>> => {
    try {
      await writeFile(path, data);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("fs:stat", async (_, path: string): Promise<IpcResult<{ isFile: boolean; isDirectory: boolean; size: number }>> => {
    try {
      const stats = await stat(path);
      return success({
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("shell:execute", async (_, command: string, cwd?: string): Promise<IpcResult<{ stdout: string; stderr: string }>> => {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd });
      return success({ stdout, stderr });
    } catch (err) {
      const error = err as { stdout?: string; stderr?: string; message?: string };
      const message = error.stderr || error.message || String(err);
      return failure(message);
    }
  });

  ipcMain.handle("dialog:openDirectory", async (): Promise<IpcResult<string | null>> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
      });
      if (result.canceled) {
        return success(null);
      }
      return success(result.filePaths[0] ?? null);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  // --- Settings ---

  ipcMain.handle("settings:load", async (): Promise<IpcResult<Record<string, unknown>>> => {
    try {
      const data = await readJsonFile<Record<string, unknown>>(SETTINGS_PATH, {});
      return success(data);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("settings:save", async (_, settings: Record<string, unknown>): Promise<IpcResult<void>> => {
    try {
      const existing = await readJsonFile<Record<string, unknown>>(SETTINGS_PATH, {});
      const merged = { ...existing, ...settings };
      await writeJsonFile(SETTINGS_PATH, merged);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("settings:get", async (_, key: string): Promise<IpcResult<unknown>> => {
    try {
      const data = await readJsonFile<Record<string, unknown>>(SETTINGS_PATH, {});
      return success(data[key] ?? null);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  // --- Credentials (encrypted) ---

  ipcMain.handle("credentials:store", async (_, key: string, value: string): Promise<IpcResult<void>> => {
    try {
      const encrypted = await encryptValue(value);
      const safeName = Buffer.from(key).toString("base64url");
      const filePath = path.join(CREDENTIALS_DIR, `${safeName}.enc`);
      await ensureDir(CREDENTIALS_DIR);
      await writeFile(filePath, encrypted, "utf-8");
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("credentials:retrieve", async (_, key: string): Promise<IpcResult<string | null>> => {
    try {
      const safeName = Buffer.from(key).toString("base64url");
      const filePath = path.join(CREDENTIALS_DIR, `${safeName}.enc`);
      const encrypted = await readFile(filePath, "utf-8");
      const decrypted = await decryptValue(encrypted);
      return success(decrypted);
    } catch {
      return success(null);
    }
  });

  ipcMain.handle("credentials:delete", async (_, key: string): Promise<IpcResult<void>> => {
    try {
      const safeName = Buffer.from(key).toString("base64url");
      const filePath = path.join(CREDENTIALS_DIR, `${safeName}.enc`);
      await unlink(filePath);
      return success(undefined);
    } catch {
      return success(undefined);
    }
  });

  ipcMain.handle("credentials:list", async (): Promise<IpcResult<string[]>> => {
    try {
      await ensureDir(CREDENTIALS_DIR);
      const files = await readdir(CREDENTIALS_DIR);
      const keys = files
        .filter((f) => f.endsWith(".enc"))
        .map((f) => Buffer.from(f.slice(0, -4), "base64url").toString("utf-8"))
        .filter(Boolean);
      return success(keys);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  // --- File system extended (rename, delete, mkdir) ---

  ipcMain.handle("fs:rename", async (_, oldPath: string, newPath: string): Promise<IpcResult<void>> => {
    try {
      await rename(oldPath, newPath);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("fs:delete", async (_, filePath: string): Promise<IpcResult<void>> => {
    try {
      await unlink(filePath);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("fs:mkdir", async (_, dirPath: string): Promise<IpcResult<void>> => {
    try {
      await mkdir(dirPath, { recursive: true });
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  // --- Orchestrator ---

  ipcMain.handle(
    "orchestrator:sendMessage",
    async (_, message: string, sessionId: string): Promise<IpcResult<void>> => {
      try {
        const result = await bridge.sendMessage(message, sessionId);
        if (!result.success) return failure(result.error ?? "Unknown error");
        return success(undefined);
      } catch (err) {
        return failure(err instanceof Error ? err.message : String(err));
      }
    }
  );

  ipcMain.handle(
    "orchestrator:getStatus",
    (): IpcResult<{ state: string; currentTask?: string }> => {
      try {
        return success(bridge.getStatus());
      } catch (err) {
        return failure(err instanceof Error ? err.message : String(err));
      }
    }
  );

  ipcMain.handle("orchestrator:abort", (): IpcResult<void> => {
    try {
      const result = bridge.abort();
      if (!result.success) return failure(result.error ?? "Unknown error");
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  });

  // --- Subagents ---

  ipcMain.handle(
    "orchestrator:subagents:list",
    (): IpcResult<bridge.SubagentInfo[]> => {
      try {
        return success(bridge.listSubagents());
      } catch (err) {
        return failure(err instanceof Error ? err.message : String(err));
      }
    }
  );

  ipcMain.handle(
    "orchestrator:subagents:kill",
    (_, id: string): IpcResult<void> => {
      try {
        const result = bridge.killSubagent(id);
        if (!result.success) return failure(result.error ?? "Unknown error");
        return success(undefined);
      } catch (err) {
        return failure(err instanceof Error ? err.message : String(err));
      }
    }
  );

  // --- Worktree ---

  ipcMain.handle(
    "worktree:accept",
    async (_, taskId: string): Promise<IpcResult<void>> => {
      try {
        const result = await bridge.acceptWorktreeChanges(taskId);
        if (!result.success) return failure(result.error ?? "Unknown error");
        return success(undefined);
      } catch (err) {
        return failure(err instanceof Error ? err.message : String(err));
      }
    }
  );

  ipcMain.handle(
    "worktree:reject",
    async (_, taskId: string): Promise<IpcResult<void>> => {
      try {
        const result = await bridge.rejectWorktreeChanges(taskId);
        if (!result.success) return failure(result.error ?? "Unknown error");
        return success(undefined);
      } catch (err) {
        return failure(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
