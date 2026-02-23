import { ConsoleEntryType } from "./types";
import clsx from "clsx";

const ENTRY_TYPES: { id: ConsoleEntryType; label: string }[] = [
  { id: "command", label: "Command" },
  { id: "stdout", label: "Stdout" },
  { id: "stderr", label: "Stderr" },
  { id: "test-result", label: "Test" },
  { id: "lint-result", label: "Lint" },
  { id: "info", label: "Info" },
];

interface ConsoleFilterProps {
  activeFilters: Set<ConsoleEntryType> | null;
  onFilterChange: (filters: Set<ConsoleEntryType> | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ConsoleFilter({
  activeFilters,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: ConsoleFilterProps) {
  const toggleFilter = (type: ConsoleEntryType) => {
    if (activeFilters === null) {
      const next = new Set<ConsoleEntryType>();
      next.add(type);
      onFilterChange(next);
    } else {
      const next = new Set(activeFilters);
      if (next.has(type)) {
        next.delete(type);
        onFilterChange(next.size === 0 ? null : next);
      } else {
        next.add(type);
        onFilterChange(next);
      }
    }
  };

  const setAll = () => {
    onFilterChange(null);
  };

  const isTypeActive = (type: ConsoleEntryType) => {
    return activeFilters !== null && activeFilters.has(type);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={setAll}
        className={clsx(
          "px-2 py-1 rounded text-xs font-medium transition-colors",
          activeFilters === null
            ? "bg-primary text-primary-foreground"
            : "bg-surface text-muted-foreground-2 hover:text-foreground"
        )}
      >
        All
      </button>
      {ENTRY_TYPES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => toggleFilter(id)}
          className={clsx(
            "px-2 py-1 rounded text-xs font-medium transition-colors",
            isTypeActive(id)
              ? "bg-surface text-foreground"
              : "bg-surface/50 text-muted-foreground"
          )}
        >
          {label}
        </button>
      ))}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search..."
        className="flex-1 min-w-32 px-2 py-1 rounded text-xs font-mono bg-surface text-foreground border border-line-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
