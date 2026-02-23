import { useState, useMemo, useCallback } from "react";
import clsx from "clsx";
import type { FileChangeInfo } from "@/hooks/useChatHistory";

interface ChangeSummaryCardProps {
  changes: FileChangeInfo[];
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onViewFullDiff?: () => void;
}

interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  lineNum: number | null;
}

function computeInlineDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const lines: DiffLine[] = [];

  const m = origLines.length;
  const n = modLines.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === modLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
      }
    }
  }

  const ops: Array<{ type: "=" | "-" | "+"; line: string; idx: number }> = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
      ops.unshift({ type: "=", line: origLines[i - 1]!, idx: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (dp[i]![j - 1] ?? 0) >= (dp[i - 1]![j] ?? 0))) {
      ops.unshift({ type: "+", line: modLines[j - 1]!, idx: j });
      j--;
    } else if (i > 0) {
      ops.unshift({ type: "-", line: origLines[i - 1]!, idx: i });
      i--;
    }
  }

  let contextBudget = 3;
  let lastChangeIdx = -1;

  for (let k = 0; k < ops.length; k++) {
    if (ops[k]!.type !== "=") lastChangeIdx = k;
  }

  let addedEllipsis = false;
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.type === "+") {
      addedEllipsis = false;
      lines.push({ type: "add", content: op.line, lineNum: op.idx });
    } else if (op.type === "-") {
      addedEllipsis = false;
      lines.push({ type: "delete", content: op.line, lineNum: op.idx });
    } else {
      const nearChange =
        k <= contextBudget ||
        k >= ops.length - contextBudget ||
        (k > 0 && ops[k - 1]?.type !== "=") ||
        (k < ops.length - 1 && ops[k + 1]?.type !== "=");

      if (nearChange && k <= lastChangeIdx + contextBudget) {
        addedEllipsis = false;
        lines.push({ type: "context", content: op.line, lineNum: op.idx });
      } else if (!addedEllipsis) {
        addedEllipsis = true;
        lines.push({ type: "context", content: "...", lineNum: null });
      }
    }
  }

  return lines;
}

function countChanges(original: string, modified: string): { additions: number; deletions: number } {
  const origLines = original ? original.split("\n").length : 0;
  const modLines = modified ? modified.split("\n").length : 0;
  return {
    additions: Math.max(0, modLines - origLines) || (modified && !original ? modLines : 0),
    deletions: Math.max(0, origLines - modLines) || (original && !modified ? origLines : 0),
  };
}

const statusConfig = {
  added: { icon: "+", label: "Added", className: "text-kado-success" },
  modified: { icon: "~", label: "Modified", className: "text-kado-warning" },
  deleted: { icon: "-", label: "Deleted", className: "text-destructive" },
} as const;

function InlineDiffView({ change }: { change: FileChangeInfo }) {
  const diffLines = useMemo(
    () => computeInlineDiff(change.original, change.modified),
    [change.original, change.modified]
  );

  if (diffLines.length === 0) return null;

  return (
    <div className="mt-2 rounded-md overflow-hidden border border-line-2 text-xs font-mono min-w-0">
      <div className="flex items-center justify-between px-3 py-1 bg-surface border-b border-line-2">
        <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-medium truncate min-w-0">
          {change.language}
        </span>
      </div>
      <pre className="overflow-x-auto bg-card max-h-64 min-w-0">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={clsx(
              "whitespace-nowrap",
              line.type === "add"
                ? "bg-kado-success/10 text-kado-success"
                : line.type === "delete"
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground"
            )}
          >
            <span className="inline-block w-5 text-right mr-2 select-none opacity-50 shrink-0">
              {line.lineNum ?? ""}
            </span>
            <span className="inline-block w-4 select-none opacity-60 shrink-0">
              {line.type === "add" ? "+" : line.type === "delete" ? "-" : " "}
            </span>
            <span className="inline-block min-w-max">{line.content}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export function ChangeSummaryCard({
  changes,
  onAcceptAll,
  onRejectAll,
  onViewFullDiff,
}: ChangeSummaryCardProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    () => new Set(changes.length <= 3 ? changes.map((c) => c.filePath) : [])
  );

  const toggleExpand = useCallback((filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  }, []);

  const totals = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const c of changes) {
      const counts = countChanges(c.original, c.modified);
      additions += counts.additions;
      deletions += counts.deletions;
    }
    return { additions, deletions };
  }, [changes]);

  if (changes.length === 0) return null;

  return (
    <div className="rounded-xl border border-line-2 bg-surface/30 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-line-2 bg-card/50 min-w-0">
        <div className="flex items-center gap-3 text-sm shrink-0">
          <span className="font-medium text-foreground">
            {changes.length} file{changes.length !== 1 ? "s" : ""} changed
          </span>
          <span className="text-kado-success font-mono text-xs">+{totals.additions}</span>
          <span className="text-destructive font-mono text-xs">-{totals.deletions}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onViewFullDiff && (
            <button
              type="button"
              onClick={onViewFullDiff}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            >
              View Full Diff
            </button>
          )}
          {onAcceptAll && (
            <button
              type="button"
              onClick={onAcceptAll}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-kado-success/15 text-kado-success hover:bg-kado-success/25 transition-colors"
            >
              Accept All
            </button>
          )}
          {onRejectAll && (
            <button
              type="button"
              onClick={onRejectAll}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
            >
              Reject All
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="divide-y divide-line-2/50">
        {changes.map((change) => {
          const config = statusConfig[change.status];
          const counts = countChanges(change.original, change.modified);
          const isExpanded = expandedFiles.has(change.filePath);
          const fileName = change.filePath.split("/").pop() ?? change.filePath;
          const dirPath = change.filePath.includes("/")
            ? change.filePath.slice(0, change.filePath.lastIndexOf("/"))
            : "";

          return (
            <div key={change.filePath}>
              <button
                type="button"
                onClick={() => toggleExpand(change.filePath)}
                className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-layer-hover transition-colors"
              >
                <span className={`flex-shrink-0 w-4 text-center font-mono text-xs font-bold ${config.className}`}>
                  {config.icon}
                </span>
                <span className="flex-1 min-w-0 flex items-baseline gap-1.5 text-sm overflow-hidden" title={change.filePath}>
                  <span className="font-medium text-foreground truncate">{fileName}</span>
                  {dirPath && (
                    <span className="text-muted-foreground text-xs truncate">{dirPath}</span>
                  )}
                </span>
                <span className="flex-shrink-0 flex items-center gap-2 text-xs font-mono">
                  <span className="text-kado-success">+{counts.additions}</span>
                  <span className="text-destructive">-{counts.deletions}</span>
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`flex-shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3">
                  <InlineDiffView change={change} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
