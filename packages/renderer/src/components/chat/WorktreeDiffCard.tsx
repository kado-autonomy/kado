import { useState, useMemo, useCallback } from "react";
import { GitBranch, Check, X } from "lucide-react";

interface DiffFile {
  path: string;
  status: string;
  original: string;
  modified: string;
  additions: number;
  deletions: number;
}

interface WorktreeDiffCardProps {
  taskId: string;
  branch: string;
  files: DiffFile[];
  accepted?: boolean;
  rejected?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onOpenFile?: (filePath: string) => void;
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

const statusConfig: Record<string, { icon: string; label: string; className: string }> = {
  added: { icon: "+", label: "Added", className: "text-kado-success" },
  modified: { icon: "~", label: "Modified", className: "text-kado-warning" },
  deleted: { icon: "-", label: "Deleted", className: "text-destructive" },
};

function InlineDiffView({ file }: { file: DiffFile }) {
  const diffLines = useMemo(
    () => computeInlineDiff(file.original, file.modified),
    [file.original, file.modified],
  );

  if (diffLines.length === 0) return null;

  return (
    <div className="mt-2 rounded-md overflow-hidden border border-line-2 text-xs font-mono min-w-0">
      <pre className="overflow-x-auto bg-card max-h-64 min-w-0">
        {diffLines.map((line, idx) => (
          <div
            key={idx}
            className={
              line.type === "add"
                ? "bg-kado-success/10 text-kado-success whitespace-nowrap"
                : line.type === "delete"
                  ? "bg-destructive/10 text-destructive whitespace-nowrap"
                  : "text-muted-foreground whitespace-nowrap"
            }
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

export function WorktreeDiffCard({
  taskId: _taskId,
  branch,
  files,
  accepted,
  rejected,
  onAccept,
  onReject,
  onOpenFile,
}: WorktreeDiffCardProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    () => new Set(files.length <= 3 ? files.map((f) => f.path) : []),
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
    for (const f of files) {
      additions += f.additions;
      deletions += f.deletions;
    }
    return { additions, deletions };
  }, [files]);

  const resolved = accepted || rejected;

  if (files.length === 0) return null;

  return (
    <div className="rounded-xl border border-line-2 bg-surface/30 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-line-2 bg-card/50 min-w-0">
        <div className="flex items-center gap-3 text-sm min-w-0 shrink-0">
          <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""} changed
          </span>
          <span className="text-kado-success font-mono text-xs">+{totals.additions}</span>
          <span className="text-destructive font-mono text-xs">-{totals.deletions}</span>
          <span className="text-muted-foreground text-xs font-mono truncate max-w-[120px]" title={branch}>
            {branch}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {resolved ? (
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                accepted
                  ? "bg-kado-success/15 text-kado-success"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {accepted ? "Accepted" : "Rejected"}
            </span>
          ) : (
            <>
              {onAccept && (
                <button
                  type="button"
                  onClick={onAccept}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-kado-success/15 text-kado-success hover:bg-kado-success/25 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Accept
                </button>
              )}
              {onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Reject
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="divide-y divide-line-2/50">
        {files.map((file) => {
          const config = statusConfig[file.status] ?? statusConfig['modified']!;
          const isExpanded = expandedFiles.has(file.path);
          const fileName = file.path.split("/").pop() ?? file.path;
          const dirPath = file.path.includes("/")
            ? file.path.slice(0, file.path.lastIndexOf("/"))
            : "";

          return (
            <div key={file.path}>
              <div className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-layer-hover transition-colors">
                <span className={`flex-shrink-0 w-4 text-center font-mono text-xs font-bold ${config.className}`}>
                  {config.icon}
                </span>
                <button
                  type="button"
                  className="flex-1 min-w-0 flex items-baseline gap-1.5 text-sm overflow-hidden text-left"
                  onClick={() => toggleExpand(file.path)}
                  title={file.path}
                >
                  <span className="font-medium text-foreground truncate">{fileName}</span>
                  {dirPath && (
                    <span className="text-muted-foreground text-xs truncate">{dirPath}</span>
                  )}
                </button>
                {onOpenFile && (
                  <button
                    type="button"
                    onClick={() => onOpenFile(file.path)}
                    className="text-[10px] text-primary/70 hover:text-primary hover:underline shrink-0"
                  >
                    Open
                  </button>
                )}
                <span className="flex-shrink-0 flex items-center gap-2 text-xs font-mono">
                  <span className="text-kado-success">+{file.additions}</span>
                  <span className="text-destructive">-{file.deletions}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleExpand(file.path)}
                  className="shrink-0"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
              {isExpanded && (
                <div className="px-4 pb-3">
                  <InlineDiffView file={file} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
