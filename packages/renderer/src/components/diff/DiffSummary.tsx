export interface DiffSummaryProps {
  fileCount: number;
  insertions: number;
  deletions: number;
  fileChanges: { filePath: string; additions: number; deletions: number }[];
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function DiffSummary({
  fileCount,
  insertions,
  deletions,
  fileChanges,
  onAcceptAll,
  onRejectAll,
}: DiffSummaryProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-line-2 bg-card">
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground-2">
          {fileCount} file{fileCount !== 1 ? "s" : ""} changed
        </span>
        <span className="text-kado-success">+{insertions}</span>
        <span className="text-destructive">-{deletions}</span>
        {fileChanges.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-md">
            {fileChanges.map(({ filePath, additions, deletions: d }) => (
              <span
                key={filePath}
                className="flex-shrink-0 px-2 py-0.5 rounded bg-surface text-muted-foreground text-xs"
                title={filePath}
              >
                {filePath.split("/").pop()}:{" "}
                <span className="text-kado-success">+{additions}</span>{" "}
                <span className="text-destructive">-{d}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAcceptAll}
          className="px-3 py-1.5 text-xs font-medium rounded bg-kado-success/20 text-kado-success hover:bg-kado-success/30 transition-colors"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={onRejectAll}
          className="px-3 py-1.5 text-xs font-medium rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
        >
          Reject All
        </button>
      </div>
    </div>
  );
}
