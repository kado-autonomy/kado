import { useState, useCallback } from "react";

export interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  language: string;
  isDirty: boolean;
  originalContent: string;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  md: "markdown",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  sql: "sql",
};

export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_LANGUAGE[ext] ?? "plaintext";
}

export function useEditorTabs() {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openFile = useCallback(async (path: string) => {
    const existing = tabs.find((t) => t.filePath === path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const result = await window.kado.fs.readFile(path);
    if (!result.success || result.data === undefined) return;

    const fileName = path.split("/").pop() ?? path;
    const content = result.data;
    const tab: EditorTab = {
      id: crypto.randomUUID(),
      filePath: path,
      fileName,
      content,
      language: getLanguageFromPath(path),
      isDirty: false,
      originalContent: content,
    };

    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    const nextTabs = tabs.filter((t) => t.id !== id);
    const idx = tabs.findIndex((t) => t.id === id);
    const wasActive = activeTabId === id;
    const nextActive = wasActive ? nextTabs[idx] ?? nextTabs[idx - 1] ?? null : null;

    setTabs(nextTabs);
    if (wasActive) setActiveTabId(nextActive?.id ?? null);
  }, [tabs, activeTabId]);

  const saveTab = useCallback(async (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;

    const result = await window.kado.fs.writeFile(tab.filePath, tab.content);
    if (!result.success) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, isDirty: false, originalContent: t.content } : t
      )
    );
  }, [tabs]);

  const updateContent = useCallback((id: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          content,
          isDirty: content !== t.originalContent,
        };
      })
    );
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const setActiveTab = useCallback((id: string | null) => {
    setActiveTabId(id);
  }, []);

  return {
    tabs,
    activeTab,
    activeTabId,
    openFile,
    closeTab,
    saveTab,
    updateContent,
    setActiveTab,
  };
}
