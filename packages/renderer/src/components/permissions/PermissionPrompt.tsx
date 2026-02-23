import { useEffect, useCallback } from "react";
import { ShieldAlert } from "lucide-react";

interface PermissionPromptProps {
  action: string;
  resource: string;
  onAllow: () => void;
  onAllowAlways: () => void;
  onDeny: () => void;
}

export function PermissionPrompt({
  action,
  resource,
  onAllow,
  onAllowAlways,
  onDeny,
}: PermissionPromptProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDeny();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onAllow();
      }
    },
    [onAllow, onDeny]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-md rounded-lg border border-line-2 bg-card shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perm-title"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line-2 bg-surface/30">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-kado-warning/10 border border-kado-warning/30">
            <ShieldAlert className="w-5 h-5 text-kado-warning" />
          </div>
          <div>
            <h2
              id="perm-title"
              className="text-sm font-semibold text-foreground"
            >
              Permission Required
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              The agent is requesting access
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="rounded-md bg-surface/50 border border-line-2 px-4 py-3 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Action
              </span>
              <span className="text-sm text-foreground font-medium">
                {action}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Resource
              </span>
              <span className="text-sm text-foreground font-mono break-all">
                {resource}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-line-2 text-muted-foreground-2 text-[11px] font-mono">Enter</kbd> to allow once
            {" · "}
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-line-2 text-muted-foreground-2 text-[11px] font-mono">Esc</kbd> to deny
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line-2 bg-surface/20">
          <button
            type="button"
            onClick={onDeny}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors duration-150"
          >
            Deny
          </button>
          <button
            type="button"
            onClick={onAllowAlways}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-surface border border-line-2 transition-colors duration-150"
          >
            Always Allow
          </button>
          <button
            type="button"
            onClick={onAllow}
            autoFocus
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover transition-colors duration-150"
          >
            Allow Once
          </button>
        </div>
      </div>
    </div>
  );
}
