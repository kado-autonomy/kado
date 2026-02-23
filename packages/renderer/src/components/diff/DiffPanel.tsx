import { useState, useMemo } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { DiffSummary } from "./DiffSummary";
import { DiffFileList } from "./DiffFileList";

export interface FileChange {
  filePath: string;
  original: string;
  modified: string;
  language: string;
  status: "added" | "modified" | "deleted";
}

interface DiffPanelProps {
  changes: FileChange[];
  onAccept: (file: FileChange) => void;
  onReject: (file: FileChange) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function DiffPanel({
  changes,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
}: DiffPanelProps) {
  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    changes[0]?.filePath ?? null
  );

  const activeChange = useMemo(
    () => changes.find((c) => c.filePath === activeFilePath) ?? null,
    [changes, activeFilePath]
  );

  const summary = useMemo(() => {
    let insertions = 0;
    let deletions = 0;
    const fileChanges = changes.map((c) => {
      const origLines = c.original.split("\n").length;
      const modLines = c.modified.split("\n").length;
      const adds = Math.max(0, modLines - origLines);
      const dels = Math.max(0, origLines - modLines);
      if (c.status === "added") {
        insertions += modLines;
      } else if (c.status === "deleted") {
        deletions += origLines;
      } else {
        insertions += adds;
        deletions += dels;
      }
      return {
        filePath: c.filePath,
        additions: c.status === "deleted" ? 0 : adds || modLines,
        deletions: c.status === "added" ? 0 : dels || origLines,
      };
    });
    return { insertions, deletions, fileChanges };
  }, [changes]);

  return (
    <div className="flex flex-col h-full bg-background">
      <DiffSummary
        fileCount={changes.length}
        insertions={summary.insertions}
        deletions={summary.deletions}
        fileChanges={summary.fileChanges}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />
      <div className="flex flex-1 min-h-0">
        <div className="w-56 flex-shrink-0 border-r border-line-2 overflow-hidden">
          <DiffFileList
            changes={changes}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            onAccept={onAccept}
            onReject={onReject}
          />
        </div>
        <div className="flex-1 min-w-0">
          {activeChange ? (
            <DiffEditor
              height="100%"
              original={activeChange.original}
              modified={activeChange.modified}
              language={activeChange.language}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: true },
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a file to view diff
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
