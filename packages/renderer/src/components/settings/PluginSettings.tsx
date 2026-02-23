import { useState, useCallback } from "react";
import { FolderOpen, ChevronDown, ChevronRight, Shield } from "lucide-react";

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  type: "tool" | "ui-panel" | "model-provider" | "integration";
  permissions: string[];
}

interface PluginEntry {
  manifest: PluginManifest;
  enabled: boolean;
  config?: Record<string, unknown>;
}

const TYPE_BADGES: Record<PluginManifest["type"], { label: string; color: string }> = {
  tool: { label: "Tool", color: "bg-blue-500/20 text-blue-400" },
  "ui-panel": { label: "UI Panel", color: "bg-purple-500/20 text-purple-400" },
  "model-provider": { label: "Model Provider", color: "bg-green-500/20 text-green-400" },
  integration: { label: "Integration", color: "bg-amber-500/20 text-amber-400" },
};

export function PluginSettings() {
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);

  const handleToggle = useCallback((name: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.manifest.name === name ? { ...p, enabled: !p.enabled } : p))
    );
  }, []);

  const handleInstall = useCallback(async () => {
    const result = await window.kado.dialog.openDirectory();
    if (!result.success || !result.data) return;

    try {
      const manifestRaw = await window.kado.fs.readFile(`${result.data}/plugin.json`);
      const manifest: PluginManifest = JSON.parse(manifestRaw);
      setPlugins((prev) => {
        if (prev.some((p) => p.manifest.name === manifest.name)) return prev;
        return [...prev, { manifest, enabled: true }];
      });
    } catch {
      // Invalid plugin directory — no plugin.json or malformed manifest
    }
  }, []);

  const toggleExpand = useCallback((name: string) => {
    setExpandedPlugin((prev) => (prev === name ? null : name));
  }, []);

  if (plugins.length === 0) {
    return (
      <div className="max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Plugins</h2>
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-1.5 text-sm text-muted-foreground-2 hover:bg-card hover:text-foreground transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            Install from directory
          </button>
        </div>
        <div className="rounded-lg border border-line-2 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No plugins installed. Install a plugin from a directory or browse the plugin catalog.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Plugins</h2>
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-1.5 text-sm text-muted-foreground-2 hover:bg-card hover:text-foreground transition-colors"
        >
          <FolderOpen className="h-4 w-4" />
          Install from directory
        </button>
      </div>

      <div className="space-y-3">
        {plugins.map((plugin) => {
          const { manifest, enabled } = plugin;
          const badge = TYPE_BADGES[manifest.type];
          const isExpanded = expandedPlugin === manifest.name;

          return (
            <div
              key={manifest.name}
              className="rounded-lg border border-line-2 bg-card overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => toggleExpand(manifest.name)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleExpand(manifest.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {manifest.name}
                    </span>
                    <span className="text-xs text-muted-foreground">v{manifest.version}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {manifest.author && (
                    <p className="text-xs text-muted-foreground mt-0.5">by {manifest.author}</p>
                  )}
                  <p className="text-xs text-muted-foreground-2 mt-1 truncate">
                    {manifest.description}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => handleToggle(manifest.name)}
                  className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                    transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background
                    ${enabled ? "bg-primary" : "bg-surface"}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition
                      ${enabled ? "translate-x-5" : "translate-x-1"}
                    `}
                  />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-line-2 px-4 py-3 space-y-3">
                  {manifest.permissions.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground-2 mb-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Permissions
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {manifest.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {plugin.config && Object.keys(plugin.config).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground-2 mb-1.5">
                        Configuration
                      </h4>
                      <pre className="rounded-md bg-surface p-2 text-[11px] text-muted-foreground overflow-x-auto">
                        {JSON.stringify(plugin.config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
