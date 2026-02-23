import { useState, useCallback, useMemo } from "react";
import type { ConsoleEntry, ConsoleEntryType } from "@/components/console/types";

export type { ConsoleEntry, ConsoleEntryType } from "@/components/console/types";

export function useConsole() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<ConsoleEntryType> | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const addEntry = useCallback((entry: Omit<ConsoleEntry, "id">) => {
    const id = crypto.randomUUID();
    setEntries((prev) => [...prev, { ...entry, id }]);
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  const setFilter = useCallback((types: Set<ConsoleEntryType> | null) => {
    setActiveFilters(types);
  }, []);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (activeFilters !== null && activeFilters.size > 0) {
      result = result.filter((e) => activeFilters.has(e.type));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.content.toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, activeFilters, searchQuery]);

  return {
    entries,
    filteredEntries,
    addEntry,
    clear,
    activeFilters,
    setFilter,
    searchQuery,
    setSearchQuery,
  };
}
