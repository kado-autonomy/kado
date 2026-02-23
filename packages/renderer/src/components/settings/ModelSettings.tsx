import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, ChevronUp, ChevronDown, Wifi, CheckCircle, XCircle } from "lucide-react";
import { useSettings, useCredentials } from "@/hooks/useSettings";
import { getDisplayName } from "@kado/shared/models";

interface ProviderConfig {
  id: string;
  label: string;
  apiKey: string;
  visible: boolean;
  url?: string;
}

type TestResult = "success" | "error" | null;

export function ModelSettings() {
  const { settings, updateSettings } = useSettings();
  const { store, retrieve } = useCredentials();

  const [providers, setProviders] = useState<ProviderConfig[]>([
    { id: "openai", label: "OpenAI", apiKey: "", visible: false },
    { id: "anthropic", label: "Anthropic", apiKey: "", visible: false },
    { id: "google", label: "Google Gemini", apiKey: "", visible: false },
    { id: "ollama", label: "Ollama", apiKey: "", visible: false, url: settings.ollamaUrl },
  ]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadKeys() {
      const [openaiKey, anthropicKey, googleKey] = await Promise.all([
        retrieve("openai-api-key"),
        retrieve("anthropic-api-key"),
        retrieve("google-api-key"),
      ]);
      if (cancelled) return;
      setProviders((prev) =>
        prev.map((p) => {
          if (p.id === "openai" && openaiKey) return { ...p, apiKey: openaiKey };
          if (p.id === "anthropic" && anthropicKey) return { ...p, apiKey: anthropicKey };
          if (p.id === "google" && googleKey) return { ...p, apiKey: googleKey };
          if (p.id === "ollama") return { ...p, url: settings.ollamaUrl };
          return p;
        })
      );
    }
    loadKeys();
    return () => { cancelled = true; };
  }, [retrieve, settings.ollamaUrl]);

  const updateProvider = useCallback(
    async (id: string, updates: Partial<ProviderConfig>) => {
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      if (updates.apiKey !== undefined && id !== "ollama") {
        await store(`${id}-api-key`, updates.apiKey);
      }
      if (updates.url !== undefined && id === "ollama") {
        await updateSettings({ ollamaUrl: updates.url });
      }
    },
    [store, updateSettings]
  );

  const moveModel = useCallback(
    (index: number, direction: "up" | "down") => {
      const next = [...settings.modelOrder];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return;
      const a = next[index];
      const b = next[target];
      if (a === undefined || b === undefined) return;
      next[index] = b;
      next[target] = a;
      updateSettings({ modelOrder: next });
    },
    [settings.modelOrder, updateSettings]
  );

  const testConnection = useCallback(
    async (id: string) => {
      setTesting(id);
      setTestResults((prev) => ({ ...prev, [id]: null }));
      try {
        const provider = providers.find((p) => p.id === id);
        if (!provider) throw new Error("Provider not found");

        if (id === "ollama") {
          const url = provider.url || "http://localhost:11434";
          const result = await window.kado.shell.execute(`curl -s -o /dev/null -w "%{http_code}" ${url}/api/tags`);
          if (result.success && result.data?.stdout?.trim() === "200") {
            setTestResults((prev) => ({ ...prev, [id]: "success" }));
          } else {
            setTestResults((prev) => ({ ...prev, [id]: "error" }));
          }
        } else if (id === "openai") {
          const result = await window.kado.shell.execute(
            `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${provider.apiKey}" https://api.openai.com/v1/models`
          );
          setTestResults((prev) => ({
            ...prev,
            [id]: result.success && result.data?.stdout?.trim() === "200" ? "success" : "error",
          }));
        } else if (id === "anthropic") {
          const result = await window.kado.shell.execute(
            `curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: ${provider.apiKey}" -H "anthropic-version: 2023-06-01" https://api.anthropic.com/v1/models`
          );
          const code = result.data?.stdout?.trim();
          setTestResults((prev) => ({
            ...prev,
            [id]: result.success && (code === "200" || code === "201") ? "success" : "error",
          }));
        } else if (id === "google") {
          const result = await window.kado.shell.execute(
            `curl -s -o /dev/null -w "%{http_code}" "https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}"`
          );
          setTestResults((prev) => ({
            ...prev,
            [id]: result.success && result.data?.stdout?.trim() === "200" ? "success" : "error",
          }));
        }
      } catch {
        setTestResults((prev) => ({ ...prev, [id]: "error" }));
      } finally {
        setTesting(null);
      }
    },
    [providers]
  );

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">AI Models</h2>
        <div className="space-y-6">
          {providers.map((p) => (
            <div key={p.id} className="rounded-lg border border-line-2 bg-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-foreground">{p.label}</h3>
              {p.id === "ollama" ? (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">URL</label>
                  <input
                    type="text"
                    value={p.url ?? "http://localhost:11434"}
                    onChange={(e) => updateProvider(p.id, { url: e.target.value || "http://localhost:11434" })}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type={p.visible ? "text" : "password"}
                      value={p.apiKey}
                      onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                      placeholder={p.id === "google" ? "AIza..." : "sk-..."}
                      className="flex-1 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setProviders((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, visible: !pp.visible } : pp))}
                      className="rounded-md border border-line-2 bg-surface p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {p.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => testConnection(p.id)}
                  disabled={!!testing}
                  className="flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-1.5 text-xs text-muted-foreground-2 hover:bg-background hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Wifi className="h-3.5 w-3.5" />
                  {testing === p.id ? "Testing..." : "Test connection"}
                </button>
                {testResults[p.id] === "success" && (
                  <span className="flex items-center gap-1 text-xs text-kado-success">
                    <CheckCircle className="h-3.5 w-3.5" /> Connected
                  </span>
                )}
                {testResults[p.id] === "error" && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> Failed
                  </span>
                )}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Model Preference Order</h3>
            <p className="text-xs text-muted-foreground mb-3">Use buttons to reorder models by priority.</p>
            <div className="space-y-2">
              {settings.modelOrder.map((model, i) => (
                <div
                  key={model}
                  className="flex items-center justify-between rounded-md border border-line-2 bg-card px-3 py-2"
                >
                  <span className="text-sm text-foreground">{getDisplayName(model)}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveModel(i, "up")}
                      disabled={i === 0}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModel(i, "down")}
                      disabled={i === settings.modelOrder.length - 1}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
