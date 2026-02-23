import type { BrowserWindow } from "electron";

/**
 * Manages a singleton Orchestrator instance and forwards its EventBus
 * events to the renderer process over IPC.
 *
 * The orchestrator dependency is lazily imported so the desktop package
 * doesn't hard-fail when the orchestrator isn't built yet.
 */

export interface OrchestratorEvent {
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

export interface SubagentInfo {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "waiting" | "completed" | "failed";
  currentTask: string;
  progress: number;
  startedAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let orchestrator: any = null;
let rendererWindow: BrowserWindow | null = null;

function forward(kind: OrchestratorEvent["kind"], payload: unknown): void {
  if (!rendererWindow || rendererWindow.isDestroyed()) return;
  rendererWindow.webContents.send("orchestrator:event", { kind, payload } satisfies OrchestratorEvent);
}

function bindEvents(): void {
  if (!orchestrator) return;
  const events = orchestrator.events;
  events.on("stateChange", (p: unknown) => forward("stateChange", p));
  events.on("progress", (p: unknown) => forward("progress", p));
  events.on("message", (p: unknown) => forward("message", p));
  events.on("error", (p: unknown) => forward("error", p));
  events.on("complete", (p: unknown) => forward("complete", p));
  events.on("toolCall", (p: unknown) => forward("toolCall", p));
  events.on("toolResult", (p: unknown) => forward("toolResult", p));
  events.on("fileChanges", (p: unknown) => forward("fileChanges", p));
  events.on("planCreated", (p: unknown) => forward("planCreated", p));
  events.on("verificationProgress", (p: unknown) => forward("verificationProgress", p));
  events.on("stepComplete", (p: unknown) => forward("stepComplete", p));
  events.on("debug", (p: unknown) => forward("debug", p));
  events.on("worktreeDiff", (p: unknown) => forward("worktreeDiff", p));
  events.on("worktreeAccepted", (p: unknown) => forward("worktreeAccepted", p));
  events.on("worktreeRejected", (p: unknown) => forward("worktreeRejected", p));
}

export function setRendererWindow(win: BrowserWindow): void {
  rendererWindow = win;
}

export function setOrchestrator(orch: unknown): void {
  orchestrator = orch;
  bindEvents();
}

export function getOrchestrator(): unknown {
  return orchestrator;
}

export async function sendMessage(message: string, _sessionId: string): Promise<{ success: boolean; error?: string }> {
  if (!orchestrator) {
    return { success: false, error: "Orchestrator not initialized" };
  }
  try {
    // Fire-and-forget: processRequest runs asynchronously and sends events
    orchestrator.processRequest(message);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export function getStatus(): { state: string; currentTask?: string } {
  if (!orchestrator) {
    return { state: "idle" };
  }
  return {
    state: orchestrator.state ?? "idle",
    currentTask: orchestrator.currentTask ?? undefined,
  };
}

export function abort(): { success: boolean; error?: string } {
  if (!orchestrator) {
    return { success: false, error: "Orchestrator not initialized" };
  }
  try {
    orchestrator.abort();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export function listSubagents(): SubagentInfo[] {
  if (!orchestrator || typeof orchestrator.listSubagents !== "function") {
    return [];
  }
  return orchestrator.listSubagents();
}

export function killSubagent(id: string): { success: boolean; error?: string } {
  if (!orchestrator || typeof orchestrator.killSubagent !== "function") {
    return { success: false, error: "Subagent management not available" };
  }
  try {
    orchestrator.killSubagent(id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function acceptWorktreeChanges(taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!orchestrator || typeof orchestrator.acceptWorktreeChanges !== "function") {
    return { success: false, error: "Worktree management not available" };
  }
  try {
    await orchestrator.acceptWorktreeChanges(taskId);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function rejectWorktreeChanges(taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!orchestrator || typeof orchestrator.rejectWorktreeChanges !== "function") {
    return { success: false, error: "Worktree management not available" };
  }
  try {
    await orchestrator.rejectWorktreeChanges(taskId);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
