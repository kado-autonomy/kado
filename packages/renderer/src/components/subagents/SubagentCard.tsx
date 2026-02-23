import { useState, useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { SubagentInfo } from "./types";
import { MessageFlow } from "./MessageFlow";

interface SubagentCardProps {
  subagent: SubagentInfo;
  onKill?: (id: string) => void;
}

const STATUS_COLORS: Record<SubagentInfo["status"], string> = {
  running: "bg-primary",
  completed: "bg-kado-success",
  failed: "bg-destructive",
  waiting: "bg-kado-warning",
  idle: "bg-muted-foreground",
};

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function SubagentCard({ subagent, onKill }: SubagentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmKill, setConfirmKill] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - subagent.startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [subagent.startedAt]);

  const handleKill = () => {
    if (confirmKill && onKill) {
      onKill(subagent.id);
      setConfirmKill(false);
    } else {
      setConfirmKill(true);
      setTimeout(() => setConfirmKill(false), 3000);
    }
  };

  return (
    <div className="rounded-lg border border-line-2 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 hover:bg-surface/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground truncate">
                {subagent.name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-xs bg-surface text-muted-foreground-2">
                {subagent.role}
              </span>
              <span
                className={clsx(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  STATUS_COLORS[subagent.status]
                )}
                title={subagent.status}
              />
            </div>
            {subagent.currentTask && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {subagent.currentTask}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                {formatElapsed(elapsed)}
              </span>
              {subagent.progress > 0 && (
                <div className="flex-1 max-w-24 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${subagent.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onKill && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleKill();
                }}
                className={clsx(
                  "p-1.5 rounded-lg transition-colors duration-150",
                  confirmKill
                    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                    : "text-muted-foreground hover:text-destructive hover:bg-surface"
                )}
                title={confirmKill ? "Click again to confirm" : "Kill subagent"}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-line-2 p-3 bg-surface/20">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Message flow
          </div>
          <MessageFlow messages={subagent.messages} />
        </div>
      )}
    </div>
  );
}
