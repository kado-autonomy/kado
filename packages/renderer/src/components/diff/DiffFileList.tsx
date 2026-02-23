import type { FileChange } from "./DiffPanel";

interface DiffFileListProps {
  changes: FileChange[];
  activeFilePath: string | null;
  onSelectFile: (filePath: string) => void;
  onAccept: (file: FileChange) => void;
  onReject: (file: FileChange) => void;
}

const statusConfig = {
  added: { icon: "+", label: "Added", className: "text-kado-success" },
  modified: { icon: "~", label: "Modified", className: "text-kado-warning" },
  deleted: { icon: "-", label: "Deleted", className: "text-destructive" },
};

export function DiffFileList({
  changes,
  activeFilePath,
  onSelectFile,
  onAccept,
  onReject,
}: DiffFileListProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-line-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Changed Files
      </div>
      <ul className="flex-1 overflow-y-auto py-1">
        {changes.map((change) => {
          const config = statusConfig[change.status];
          const isActive = activeFilePath === change.filePath;
          return (
            <li
              key={change.filePath}
              className={`group flex flex-col border-b border-line-2/50 ${
                isActive ? "bg-primary/10" : "hover:bg-layer-hover"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectFile(change.filePath)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm truncate"
              >
                <span className={`flex-shrink-0 w-5 text-center font-mono ${config.className}`}>
                  {config.icon}
                </span>
                <span className="flex-1 truncate" title={change.filePath}>
                  {change.filePath.split("/").pop() ?? change.filePath}
                </span>
              </button>
              <div className="flex items-center gap-1 px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs bg-surface text-muted-foreground">
                  {config.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept(change);
                  }}
                  className="p-1 rounded text-kado-success hover:bg-kado-success/20 transition-colors"
                  title="Accept"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(change);
                  }}
                  className="p-1 rounded text-destructive hover:bg-destructive/20 transition-colors"
                  title="Reject"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
