import { SubagentMessage } from "./types";
import clsx from "clsx";

interface MessageFlowProps {
  messages: SubagentMessage[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function MessageFlow({ messages }: MessageFlowProps) {
  if (messages.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg, idx) => {
        const isToSubagent = msg.to !== "orchestrator";
        return (
          <div
            key={idx}
            className={clsx(
              "flex items-start gap-2 rounded px-2 py-1.5 text-sm",
              isToSubagent ? "bg-surface/50" : "bg-card"
            )}
          >
            <span
              className={clsx(
                "flex-shrink-0 text-xs",
                isToSubagent ? "text-primary" : "text-kado-success"
              )}
            >
              {isToSubagent ? "→" : "←"}
            </span>
            <div className="flex-1 min-w-0">
              <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-surface text-muted-foreground-2 mr-2">
                {msg.type}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatTime(msg.timestamp)}
              </span>
              <div className="text-foreground mt-0.5 truncate">
                {msg.from} → {msg.to}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
