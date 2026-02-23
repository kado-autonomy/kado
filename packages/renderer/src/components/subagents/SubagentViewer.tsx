import { SubagentInfo } from "./types";
import { SubagentCard } from "./SubagentCard";

interface SubagentViewerProps {
  subagents: SubagentInfo[];
  onKill?: (id: string) => void;
}

export function SubagentViewer({ subagents, onKill }: SubagentViewerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line-2">
        <h2 className="font-semibold text-foreground">Subagents</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground-2">
          {subagents.length}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {subagents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No active subagents</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subagents.map((s) => (
              <SubagentCard key={s.id} subagent={s} onKill={onKill} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
