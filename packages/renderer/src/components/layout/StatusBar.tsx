type AgentStatus = "idle" | "running" | "planning" | "verifying";

interface StatusBarProps {
  status?: AgentStatus;
  tokenUsage?: string;
  model?: string;
  projectPath?: string;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Idle",
  running: "Running",
  planning: "Planning",
  verifying: "Verifying",
};

export function StatusBar({
  status = "idle",
  tokenUsage = "0 / 0",
  model = "gpt-5.2",
  projectPath,
}: StatusBarProps) {
  const projectName = projectPath
    ? projectPath.split("/").filter(Boolean).pop()
    : null;

  return (
    <div className="flex h-7 items-center justify-between px-3 text-xs bg-footer text-muted-foreground select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={
              status !== "idle"
                ? "w-2 h-2 rounded-full bg-primary animate-pulse"
                : "w-2 h-2 rounded-full bg-muted-foreground/40"
            }
            aria-hidden
          />
          <span className={status !== "idle" ? "text-muted-foreground-2" : undefined}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <span className="text-muted-foreground/70">Tokens: <span className="text-muted-foreground-1">{tokenUsage}</span></span>
        <span className="text-muted-foreground/70">Model: <span className="text-muted-foreground-1">{model}</span></span>
      </div>
      <div className="flex items-center gap-2">
        {projectName && (
          <span className="text-muted-foreground/60" title={projectPath}>
            {projectName}
          </span>
        )}
      </div>
    </div>
  );
}
