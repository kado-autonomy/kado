import { useState, useCallback, useEffect } from "react";

export type ChatMessageType =
  | "text"
  | "clarifying-question"
  | "change-summary"
  | "tool-call"
  | "plan-created"
  | "step-progress"
  | "worktree-diff";

export interface ClarifyingQuestionMeta {
  options?: string[];
  allowFreeText?: boolean;
}

export interface FileChangeInfo {
  filePath: string;
  original: string;
  modified: string;
  language: string;
  status: "added" | "modified" | "deleted";
}

export interface PlanStepMeta {
  id: string;
  toolName: string;
  description: string;
  dependsOn: string[];
}

export interface ChatMessageMeta extends ClarifyingQuestionMeta {
  fileChanges?: FileChangeInfo[];
  toolName?: string;
  args?: Record<string, unknown>;
  title?: string;
  steps?: PlanStepMeta[];
  completed?: boolean;
  success?: boolean;
  worktreeDiff?: Partial<{
    taskId: string;
    branch: string;
    files: Array<{
      path: string;
      status: string;
      original: string;
      modified: string;
      additions: number;
      deletions: number;
    }>;
    accepted: boolean;
    rejected: boolean;
  }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  type?: ChatMessageType;
  meta?: ChatMessageMeta;
}

const STORAGE_KEY_PREFIX = "kado-chat-";

function loadFromStorage(sessionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(sessionId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(messages));
  } catch {
    // ignore storage errors
  }
}

export function useChatHistory(sessionId: string = "default") {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadFromStorage(sessionId)
  );

  useEffect(() => {
    saveToStorage(sessionId, messages);
  }, [sessionId, messages]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    const message: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, message]);
    return message.id;
  }, []);

  const updateMessage = useCallback(
    (id: string, partial: Partial<Pick<ChatMessage, "content" | "isStreaming" | "meta">>) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const merged = { ...m, ...partial };
          if (partial.meta && m.meta) {
            merged.meta = { ...m.meta, ...partial.meta };
            if (partial.meta.worktreeDiff && m.meta.worktreeDiff) {
              merged.meta.worktreeDiff = { ...m.meta.worktreeDiff, ...partial.meta.worktreeDiff };
            }
          }
          return merged;
        })
      );
    },
    []
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const isStreaming = messages.some((m) => m.isStreaming);

  return {
    messages,
    addMessage,
    updateMessage,
    clearHistory,
    isStreaming,
  };
}
