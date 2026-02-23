import { useCallback } from "react";
import { FolderOpen, Save } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { MODELS } from "@kado/shared/models";

export function GeneralSettings() {
  const { settings, loading, updateSettings } = useSettings();

  const handleBrowse = useCallback(async () => {
    const result = await window.kado.dialog.openDirectory();
    if (result.success && result.data) {
      updateSettings({ projectPath: result.data });
    }
  }, [updateSettings]);

  if (loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">General</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">Project Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.projectPath}
                onChange={(e) => updateSettings({ projectPath: e.target.value })}
                placeholder="/path/to/your/project"
                className="flex-1 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-muted-foreground-2 hover:bg-card hover:text-foreground transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                Browse
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">
              Max Token Budget: {settings.maxTokenBudget.toLocaleString()}
            </label>
            <input
              type="range"
              min={50000}
              max={500000}
              step={10000}
              value={settings.maxTokenBudget}
              onChange={(e) => updateSettings({ maxTokenBudget: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none bg-surface accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>50k</span>
              <span>500k</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">
              Max Concurrent Subagents: {settings.maxSubagents}
            </label>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={settings.maxSubagents}
              onChange={(e) => updateSettings({ maxSubagents: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none bg-surface accent-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground-2">Auto-save</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoSave}
              onClick={() => updateSettings({ autoSave: !settings.autoSave })}
              className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background
                ${settings.autoSave ? "bg-primary" : "bg-surface"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition
                  ${settings.autoSave ? "translate-x-5" : "translate-x-1"}
                `}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">Default Model</label>
            <select
              value={settings.defaultModel}
              onChange={(e) => updateSettings({ defaultModel: e.target.value })}
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
