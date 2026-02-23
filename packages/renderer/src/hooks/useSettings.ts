import { useState, useEffect, useCallback, useRef } from "react";
import { DEFAULT_MODEL_ID, DEFAULT_MODEL_ORDER } from "@kado/shared/models";

export interface AppSettings {
  projectPath: string;
  maxTokenBudget: number;
  maxSubagents: number;
  autoSave: boolean;
  defaultModel: string;
  modelOrder: string[];
  ollamaUrl: string;
  onboardingComplete: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  projectPath: "",
  maxTokenBudget: 200000,
  maxSubagents: 4,
  autoSave: true,
  defaultModel: DEFAULT_MODEL_ID,
  modelOrder: [...DEFAULT_MODEL_ORDER],
  ollamaUrl: "http://localhost:11434",
  onboardingComplete: false,
};

let cachedSettings: AppSettings | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function loadFromDisk(): Promise<AppSettings> {
  try {
    const result = await window.kado.settings.load();
    if (result.success && result.data) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...(result.data as Partial<AppSettings>) };
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }
  return cachedSettings;
}

async function saveToDisk(settings: Partial<AppSettings>): Promise<void> {
  cachedSettings = { ...(cachedSettings ?? DEFAULT_SETTINGS), ...settings };
  notifyListeners();
  await window.kado.settings.save(settings as Record<string, unknown>);
}

export function useSettings(): {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
} {
  const [settings, setSettings] = useState<AppSettings>(cachedSettings ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(cachedSettings === null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const listener = () => {
      if (mountedRef.current && cachedSettings) {
        setSettings({ ...cachedSettings });
      }
    };
    listeners.add(listener);

    if (cachedSettings === null) {
      loadFromDisk().then((loaded) => {
        if (mountedRef.current) {
          setSettings(loaded);
          setLoading(false);
        }
      });
    }

    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    await saveToDisk(updates);
  }, []);

  return { settings, loading, updateSettings };
}

export function useCredentials() {
  const store = useCallback(async (key: string, value: string) => {
    const result = await window.kado.credentials.store(key, value);
    if (!result.success) throw new Error(result.error);
  }, []);

  const retrieve = useCallback(async (key: string): Promise<string | null> => {
    const result = await window.kado.credentials.retrieve(key);
    if (!result.success) throw new Error(result.error);
    return result.data ?? null;
  }, []);

  const remove = useCallback(async (key: string) => {
    await window.kado.credentials.delete(key);
  }, []);

  const list = useCallback(async (): Promise<string[]> => {
    const result = await window.kado.credentials.list();
    return result.data ?? [];
  }, []);

  return { store, retrieve, remove, list };
}
