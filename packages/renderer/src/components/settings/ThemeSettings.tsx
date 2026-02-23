import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Monitor, Sun, Moon } from "lucide-react";
import clsx from "clsx";

const ACCENT_PRESETS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
];

const FONT_FAMILIES = [
  { id: "system", label: "System" },
  { id: "inter", label: "Inter" },
  { id: "jetbrains", label: "JetBrains Mono" },
  { id: "fira", label: "Fira Code" },
];

export function ThemeSettings() {
  const { mode, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("system");
  const [accent, setAccent] = useState("#3b82f6");

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Theme</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">Appearance</label>
            <div className="flex gap-2">
              {(["dark", "light", "system"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTheme(m)}
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    mode === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-line-2 bg-surface text-muted-foreground-2 hover:bg-card hover:text-foreground"
                  )}
                >
                  {m === "dark" && <Moon className="h-4 w-4" />}
                  {m === "light" && <Sun className="h-4 w-4" />}
                  {m === "system" && <Monitor className="h-4 w-4" />}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min={12}
              max={18}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-surface accent-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccent(color)}
                  className={clsx(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                    accent === color ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground-2 mb-2">Preview</label>
            <div className="rounded-lg border border-line-2 bg-card p-4 space-y-2">
              <div className="text-sm font-medium text-foreground">Sample heading</div>
              <div className="text-sm text-muted-foreground-2">Sample body text with some content.</div>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 transition-opacity duration-150"
                style={accent !== "#3b82f6" ? { backgroundColor: accent } : undefined}
              >
                Accent button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
