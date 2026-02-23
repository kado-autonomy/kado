import { useState } from "react";
import { Settings, Cpu, Palette, Keyboard, Puzzle, Info } from "lucide-react";
import clsx from "clsx";
import { GeneralSettings } from "./GeneralSettings";
import { ModelSettings } from "./ModelSettings";
import { ThemeSettings } from "./ThemeSettings";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { PluginSettings } from "./PluginSettings";

type SettingsSection = "general" | "models" | "theme" | "shortcuts" | "plugins" | "about";

const SECTIONS: { id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "models", label: "AI Models", icon: Cpu },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
  { id: "plugins", label: "Plugins", icon: Puzzle },
  { id: "about", label: "About", icon: Info },
];

interface SettingsPanelProps {
  onClose?: () => void;
  className?: string;
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const [active, setActive] = useState<SettingsSection>("general");

  return (
    <div className={clsx("flex h-full bg-background", className)}>
      <nav className="w-48 flex-shrink-0 border-r border-line-2 bg-card p-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={clsx(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active === id
                ? "bg-surface text-primary"
                : "text-muted-foreground-2 hover:bg-surface/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-auto p-6">
        {active === "general" && <GeneralSettings />}
        {active === "models" && <ModelSettings />}
        {active === "theme" && <ThemeSettings />}
        {active === "shortcuts" && <ShortcutsPanel />}
        {active === "plugins" && <PluginSettings />}
        {active === "about" && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">About Kado v2</h2>
            <p className="text-sm text-muted-foreground-2">
              Kado v2 is an autonomous coding agent that helps you build software. It understands your codebase,
              runs commands, and collaborates with you through natural conversation.
            </p>
            <p className="text-xs text-muted-foreground">Version 0.1.0 · MIT License</p>
          </div>
        )}
      </div>
    </div>
  );
}
