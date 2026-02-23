import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { FileIcon } from "./FileIcon";
import type { FileEntry } from "@/hooks/useFileTree";
import clsx from "clsx";

interface FileTreeProps {
  entries: FileEntry[];
  depth?: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onFileOpen: (path: string) => void;
  onLoadChildren: (entry: FileEntry) => Promise<FileEntry[]>;
  onUpdateChildren: (path: string, children: FileEntry[]) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry) => void;
}

export function FileTree({
  entries,
  depth = 0,
  selectedPath,
  onSelect,
  onFileOpen,
  onLoadChildren,
  onUpdateChildren,
  onContextMenu,
}: FileTreeProps) {
  return (
    <div className="select-none">
      {entries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={depth}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onFileOpen={onFileOpen}
          onLoadChildren={onLoadChildren}
          onUpdateChildren={onUpdateChildren}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onFileOpen: (path: string) => void;
  onLoadChildren: (entry: FileEntry) => Promise<FileEntry[]>;
  onUpdateChildren: (path: string, children: FileEntry[]) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry) => void;
}

function FileTreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  onFileOpen,
  onLoadChildren,
  onUpdateChildren,
  onContextMenu,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedPath === entry.path;

  const handleClick = async () => {
    onSelect(entry.path);
    if (entry.isDirectory) {
      if (!entry.children && entry.isDirectory) {
        const children = await onLoadChildren(entry);
        onUpdateChildren(entry.path, children);
      }
      setIsExpanded((prev) => !prev);
    } else {
      onFileOpen(entry.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, entry);
  };

  const indent = depth * 16;

  return (
    <div className="flex flex-col">
      <div
        className={clsx(
          "flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer group transition-colors duration-100",
          "hover:bg-surface/50",
          isSelected && "bg-primary/10 text-foreground"
        )}
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {entry.isDirectory ? (
          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <FileIcon name={entry.name} isDirectory={entry.isDirectory} isOpen={entry.isDirectory && isExpanded} />
        <span className="truncate text-sm text-foreground ml-1">{entry.name}</span>
      </div>
      {entry.isDirectory && isExpanded && entry.children && (
        <FileTree
          entries={entry.children}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onFileOpen={onFileOpen}
          onLoadChildren={onLoadChildren}
          onUpdateChildren={onUpdateChildren}
          onContextMenu={onContextMenu}
        />
      )}
    </div>
  );
}
