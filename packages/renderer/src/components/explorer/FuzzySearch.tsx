import { useState, useEffect, useRef, useMemo } from "react";
import clsx from "clsx";
import { FileIcon } from "./FileIcon";
import type { FileEntry } from "@/hooks/useFileTree";

function fuzzyMatch(query: string, str: string): number[] | null {
  const q = query.toLowerCase();
  const s = str.toLowerCase();
  let qi = 0;
  const indices: number[] = [];
  for (let si = 0; si < s.length && qi < q.length; si++) {
    if (s[si] === q[qi]) {
      indices.push(si);
      qi++;
    }
  }
  return qi === q.length ? indices : null;
}

function flattenFiles(entries: FileEntry[]): FileEntry[] {
  const result: FileEntry[] = [];
  for (const e of entries) {
    result.push({ name: e.name, path: e.path, isDirectory: e.isDirectory });
    if (e.isDirectory && e.children) {
      result.push(...flattenFiles(e.children));
    }
  }
  return result;
}

interface FuzzySearchProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileEntry[];
  onFileSelect: (path: string) => void;
}

export function FuzzySearch({ isOpen, onClose, files, onFileSelect }: FuzzySearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  const matches = useMemo(() => {
    if (!query.trim()) return flatFiles.map((f) => ({ file: f, indices: null as number[] | null }));
    const results: { file: typeof flatFiles[0]; indices: number[] | null; rank: number }[] = [];
    for (const file of flatFiles) {
      const indices = fuzzyMatch(query, file.name);
      if (indices) results.push({ file, indices, rank: indices[0] ?? 0 });
    }
    results.sort((a, b) => {
      const aFirst = a.indices?.[0] ?? 0;
      const bFirst = b.indices?.[0] ?? 0;
      if (aFirst !== bFirst) return aFirst - bFirst;
      return a.file.name.length - b.file.name.length;
    });
    return results;
  }, [query, flatFiles]);

  const fileList = query.trim() ? matches.map((m) => m.file) : flatFiles;

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const item = el.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, fileList]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, fileList.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && fileList[selectedIndex]) {
        e.preventDefault();
        onFileSelect(fileList[selectedIndex].path);
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, fileList, selectedIndex, onFileSelect, onClose]);

  const handleSelect = (path: string) => {
    onFileSelect(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-xl border border-line-2 bg-card shadow-2xl shadow-black/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground border-b border-line-2 focus:outline-none focus:ring-0"
        />
        <div ref={listRef} className="max-h-64 overflow-y-auto py-2">
          {fileList.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">No matches</div>
          ) : (
            (query.trim() ? matches : fileList.map((f) => ({ file: f, indices: null as number[] | null }))).map(({ file, indices }, i) => (
              <button
                key={file.path}
                type="button"
                className={clsx(
                  "w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors",
                  i === selectedIndex ? "bg-surface text-foreground" : "text-muted-foreground-2 hover:bg-surface/50"
                )}
                onClick={() => handleSelect(file.path)}
              >
                <FileIcon name={file.name} isDirectory={file.isDirectory} />
                <span className="truncate">
                  {indices
                    ? file.name.split("").map((ch, j) =>
                        indices.includes(j) ? (
                          <mark key={j} className="bg-primary/30 text-inherit rounded px-0.5">
                            {ch}
                          </mark>
                        ) : (
                          <span key={j}>{ch}</span>
                        )
                      )
                    : file.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
