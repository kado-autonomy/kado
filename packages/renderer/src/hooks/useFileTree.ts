import { useState, useCallback } from "react";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

export function useFileTree() {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [rootPath, setRootPathState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDirectory = useCallback(async (path: string): Promise<FileEntry[]> => {
    const result = await window.kado.fs.readDir(path);
    if (!result.success || !result.data) return [];

    const entries: FileEntry[] = [];
    for (const name of result.data) {
      const fullPath = path.endsWith("/") ? `${path}${name}` : `${path}/${name}`;
      const statResult = await window.kado.fs.stat(fullPath);
      if (!statResult.success || !statResult.data) continue;

      entries.push({
        name,
        path: fullPath,
        isDirectory: statResult.data.isDirectory,
        children: statResult.data.isDirectory ? undefined : undefined,
      });
    }

    const dirs = entries
      .filter((e) => e.isDirectory)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const files = entries
      .filter((e) => !e.isDirectory)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return [...dirs, ...files];
  }, []);

  const setRootPath = useCallback(
    async (path: string | null) => {
      setRootPathState(path);
      if (!path) {
        setTree([]);
        return;
      }
      setIsLoading(true);
      try {
        const entries = await loadDirectory(path);
        setTree(entries);
      } finally {
        setIsLoading(false);
      }
    },
    [loadDirectory]
  );

  const refreshTree = useCallback(async () => {
    if (!rootPath) return;
    setIsLoading(true);
    try {
      const entries = await loadDirectory(rootPath);
      setTree(entries);
    } finally {
      setIsLoading(false);
    }
  }, [rootPath, loadDirectory]);

  const loadChildren = useCallback(
    async (entry: FileEntry): Promise<FileEntry[]> => {
      if (!entry.isDirectory) return [];
      const children = await loadDirectory(entry.path);
      return children;
    },
    [loadDirectory]
  );

  const updateEntryChildren = useCallback((path: string, children: FileEntry[]) => {
    setTree((prev) => updateEntryInTree(prev, path, children));
  }, []);

  return {
    tree,
    rootPath,
    setRootPath,
    loadDirectory,
    loadChildren,
    updateEntryChildren,
    refreshTree,
    isLoading,
  };
}

function updateEntryInTree(entries: FileEntry[], path: string, children: FileEntry[]): FileEntry[] {
  return entries.map((e) => {
    if (e.path === path) return { ...e, children };
    if (e.isDirectory && e.children) return { ...e, children: updateEntryInTree(e.children, path, children) };
    return e;
  });
}
