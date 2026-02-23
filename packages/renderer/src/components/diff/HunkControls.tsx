export interface HunkInfo {
  startLine: number;
  endLine: number;
  type: "add" | "delete" | "modify";
  original: string;
  modified: string;
}

interface HunkControlsProps {
  hunk: HunkInfo;
  onAccept: () => void;
  onReject: () => void;
}

export function HunkControls({ hunk: _hunk, onAccept, onReject }: HunkControlsProps) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAccept();
        }}
        className="p-1.5 rounded bg-kado-success/20 text-kado-success hover:bg-kado-success/30 transition-colors"
        title="Accept hunk"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReject();
        }}
        className="p-1.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
        title="Reject hunk"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
