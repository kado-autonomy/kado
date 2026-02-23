import { useRef, useEffect, useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { ConsoleEntry } from "./types";
import { ConsoleOutput } from "./ConsoleOutput";
import { ConsoleFilter } from "./ConsoleFilter";

interface ResultsConsoleProps {
  entries: ConsoleEntry[];
  filteredEntries: ConsoleEntry[];
  onClear: () => void;
  activeFilters: Set<ConsoleEntry["type"]> | null;
  onFilterChange: (filters: Set<ConsoleEntry["type"]> | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ResultsConsole({
  entries,
  filteredEntries,
  onClear,
  activeFilters,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: ResultsConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEntries, autoScroll]);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-line-2">
        <h2 className="font-semibold text-foreground">Console</h2>
        <div className="flex items-center gap-2">
          <ConsoleFilter
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={clsx(
              "p-1.5 rounded transition-colors",
              autoScroll
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-layer-hover transition-colors"
            title="Clear console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-4 font-mono"
      >
        {filteredEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            {entries.length === 0
              ? "No output yet"
              : "No entries match the current filter"}
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEntries.map((entry) => (
              <ConsoleOutput key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
