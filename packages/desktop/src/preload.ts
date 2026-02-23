import { contextBridge, ipcRenderer } from "electron";

type IpcResult<T = unknown> = { success: boolean; data?: T; error?: string };

interface OrchestratorEvent {
  kind: "stateChange" | "progress" | "message" | "error" | "complete" | "toolCall" | "toolResult"
    | "fileChanges" | "planCreated" | "verificationProgress" | "stepComplete" | "debug"
    | "worktreeDiff" | "worktreeAccepted" | "worktreeRejected";
  payload: unknown;
}

interface SubagentInfo {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "waiting" | "completed" | "failed";
  currentTask: string;
  progress: number;
  startedAt: number;
}

interface KadoApi {
  fs: {
    readDir: (path: string) => Promise<IpcResult<string[]>>;
    readFile: (path: string, encoding?: BufferEncoding) => Promise<IpcResult<string | Buffer>>;
    writeFile: (path: string, data: string | Buffer) => Promise<IpcResult<void>>;
    stat: (path: string) => Promise<IpcResult<{ isFile: boolean; isDirectory: boolean; size: number }>>;
    rename: (oldPath: string, newPath: string) => Promise<IpcResult<void>>;
    delete: (path: string) => Promise<IpcResult<void>>;
    mkdir: (path: string) => Promise<IpcResult<void>>;
  };
  shell: {
    execute: (command: string, cwd?: string) => Promise<IpcResult<{ stdout: string; stderr: string }>>;
  };
  dialog: {
    openDirectory: () => Promise<IpcResult<string | null>>;
  };
  settings: {
    load: () => Promise<IpcResult<Record<string, unknown>>>;
    save: (settings: Record<string, unknown>) => Promise<IpcResult<void>>;
    get: (key: string) => Promise<IpcResult<unknown>>;
  };
  credentials: {
    store: (key: string, value: string) => Promise<IpcResult<void>>;
    retrieve: (key: string) => Promise<IpcResult<string | null>>;
    delete: (key: string) => Promise<IpcResult<void>>;
    list: () => Promise<IpcResult<string[]>>;
  };
  orchestrator: {
    sendMessage: (message: string, sessionId: string) => Promise<IpcResult<void>>;
    getStatus: () => Promise<IpcResult<{ state: string; currentTask?: string }>>;
    abort: () => Promise<IpcResult<void>>;
    onEvent: (callback: (event: OrchestratorEvent) => void) => () => void;
    listSubagents: () => Promise<IpcResult<SubagentInfo[]>>;
    killSubagent: (id: string) => Promise<IpcResult<void>>;
  };
  worktree: {
    accept: (taskId: string) => Promise<IpcResult<void>>;
    reject: (taskId: string) => Promise<IpcResult<void>>;
  };
}

const kado: KadoApi = {
  fs: {
    readDir: (path: string) => ipcRenderer.invoke("fs:readDir", path),
    readFile: (path: string, encoding?: BufferEncoding) => ipcRenderer.invoke("fs:readFile", path, encoding),
    writeFile: (path: string, data: string | Buffer) => ipcRenderer.invoke("fs:writeFile", path, data),
    stat: (path: string) => ipcRenderer.invoke("fs:stat", path),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke("fs:rename", oldPath, newPath),
    delete: (path: string) => ipcRenderer.invoke("fs:delete", path),
    mkdir: (path: string) => ipcRenderer.invoke("fs:mkdir", path),
  },
  shell: {
    execute: (command: string, cwd?: string) => ipcRenderer.invoke("shell:execute", command, cwd),
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  },
  settings: {
    load: () => ipcRenderer.invoke("settings:load"),
    save: (settings: Record<string, unknown>) => ipcRenderer.invoke("settings:save", settings),
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
  },
  credentials: {
    store: (key: string, value: string) => ipcRenderer.invoke("credentials:store", key, value),
    retrieve: (key: string) => ipcRenderer.invoke("credentials:retrieve", key),
    delete: (key: string) => ipcRenderer.invoke("credentials:delete", key),
    list: () => ipcRenderer.invoke("credentials:list"),
  },
  orchestrator: {
    sendMessage: (message: string, sessionId: string) =>
      ipcRenderer.invoke("orchestrator:sendMessage", message, sessionId),
    getStatus: () => ipcRenderer.invoke("orchestrator:getStatus"),
    abort: () => ipcRenderer.invoke("orchestrator:abort"),
    onEvent: (callback: (event: OrchestratorEvent) => void) => {
      const handler = (_event: unknown, data: OrchestratorEvent) => callback(data);
      ipcRenderer.on("orchestrator:event", handler);
      return () => {
        ipcRenderer.removeListener("orchestrator:event", handler);
      };
    },
    listSubagents: () => ipcRenderer.invoke("orchestrator:subagents:list"),
    killSubagent: (id: string) => ipcRenderer.invoke("orchestrator:subagents:kill", id),
  },
  worktree: {
    accept: (taskId: string) => ipcRenderer.invoke("worktree:accept", taskId),
    reject: (taskId: string) => ipcRenderer.invoke("worktree:reject", taskId),
  },
};

contextBridge.exposeInMainWorld("kado", kado);

declare global {
  interface Window {
    kado: KadoApi;
  }
}
