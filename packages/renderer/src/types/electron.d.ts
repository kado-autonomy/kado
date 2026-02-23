type IpcResult<T = unknown> = { success: boolean; data?: T; error?: string };

interface KadoFS {
  readDir(path: string): Promise<IpcResult<string[]>>;
  readFile(path: string): Promise<IpcResult<string>>;
  writeFile(path: string, content: string): Promise<IpcResult<void>>;
  stat(path: string): Promise<IpcResult<{ isFile: boolean; isDirectory: boolean; size: number; modified?: number }>>;
  rename(oldPath: string, newPath: string): Promise<IpcResult<void>>;
  delete(path: string): Promise<IpcResult<void>>;
  mkdir(path: string): Promise<IpcResult<void>>;
}

interface KadoShell {
  execute(command: string, cwd?: string): Promise<IpcResult<{ stdout: string; stderr: string }>>;
}

interface KadoDialog {
  openDirectory(): Promise<IpcResult<string | null>>;
}

interface KadoSettings {
  load(): Promise<IpcResult<Record<string, unknown>>>;
  save(settings: Record<string, unknown>): Promise<IpcResult<void>>;
  get(key: string): Promise<IpcResult<unknown>>;
}

interface KadoCredentials {
  store(key: string, value: string): Promise<IpcResult<void>>;
  retrieve(key: string): Promise<IpcResult<string | null>>;
  delete(key: string): Promise<IpcResult<void>>;
  list(): Promise<IpcResult<string[]>>;
}

interface FileChangeInfo {
  filePath: string;
  original: string;
  modified: string;
  language: string;
  status: "added" | "modified" | "deleted";
}

interface OrchestratorEvent {
  kind:
    | "stateChange"
    | "progress"
    | "message"
    | "error"
    | "complete"
    | "toolCall"
    | "toolResult"
    | "fileChanges"
    | "planCreated"
    | "verificationProgress"
    | "stepComplete"
    | "debug"
    | "worktreeDiff"
    | "worktreeAccepted"
    | "worktreeRejected";
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
  messages?: Array<{ from: string; to: string; type: string; timestamp: number }>;
}

interface KadoOrchestrator {
  sendMessage(message: string, sessionId: string): Promise<IpcResult<void>>;
  getStatus(): Promise<IpcResult<{ state: string; currentTask?: string }>>;
  abort(): Promise<IpcResult<void>>;
  onEvent(callback: (event: OrchestratorEvent) => void): () => void;
  listSubagents(): Promise<IpcResult<SubagentInfo[]>>;
  killSubagent(id: string): Promise<IpcResult<void>>;
}

interface KadoWorktree {
  accept(taskId: string): Promise<IpcResult<void>>;
  reject(taskId: string): Promise<IpcResult<void>>;
}

interface KadoAPI {
  fs: KadoFS;
  shell: KadoShell;
  dialog: KadoDialog;
  settings: KadoSettings;
  credentials: KadoCredentials;
  orchestrator: KadoOrchestrator;
  worktree: KadoWorktree;
}

declare global {
  interface Window {
    kado: KadoAPI;
  }
}

export {};
