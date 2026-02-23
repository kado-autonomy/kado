import { useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useCredentials } from "@/hooks/useSettings";

interface ApiKeyStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function ApiKeyStep({ onNext }: ApiKeyStepProps) {
  const [openai, setOpenai] = useState("");
  const [anthropic, setAnthropic] = useState("");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [saving, setSaving] = useState(false);
  const { store } = useCredentials();

  const hasAtLeastOne = openai.trim().length > 0 || anthropic.trim().length > 0;

  const handleSaveAndNext = useCallback(async () => {
    setSaving(true);
    try {
      if (openai.trim()) await store("openai-api-key", openai.trim());
      if (anthropic.trim()) await store("anthropic-api-key", anthropic.trim());
      onNext();
    } finally {
      setSaving(false);
    }
  }, [openai, anthropic, store, onNext]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Configure API Keys</h2>
        <p className="text-sm text-muted-foreground-2">
          Add at least one API key to get started. You can add more later in Settings.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground-2 mb-1">OpenAI API Key</label>
          <div className="flex gap-2">
            <input
              type={showOpenai ? "text" : "password"}
              value={openai}
              onChange={(e) => setOpenai(e.target.value)}
              placeholder="sk-..."
              className="flex-1 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowOpenai(!showOpenai)}
              className="rounded-md border border-line-2 bg-surface p-2 text-muted-foreground hover:text-foreground"
            >
              {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground-2 mb-1">Anthropic API Key</label>
          <div className="flex gap-2">
            <input
              type={showAnthropic ? "text" : "password"}
              value={anthropic}
              onChange={(e) => setAnthropic(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowAnthropic(!showAnthropic)}
              className="rounded-md border border-line-2 bg-surface p-2 text-muted-foreground hover:text-foreground"
            >
              {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      {!hasAtLeastOne && (
        <p className="text-xs text-kado-warning">At least one API key is recommended to continue.</p>
      )}
      {hasAtLeastOne && (
        <button
          type="button"
          onClick={handleSaveAndNext}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-150 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Keys & Continue"}
        </button>
      )}
    </div>
  );
}
