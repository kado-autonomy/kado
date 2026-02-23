import { useState, useCallback, useRef, useEffect } from "react";
import { FolderOpen, RefreshCw, Search, Loader2 } from "lucide-react";
import { FileTree } from "./FileTree";
import { FileContextMenu, type ContextMenuAction } from "./FileContextMenu";
import { FuzzySearch } from "./FuzzySearch";
import { useFileTree, type FileEntry } from "@/hooks/useFileTree";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSettings } from "@/hooks/useSettings";

type InlineInputMode =
  | { kind: "newFile"; parentPath: string }
  | { kind: "rename"; oldPath: string; currentName: string }
  | null;

type ConfirmDeleteState = { path: string; name: string } | null;

interface FileExplorerProps {
  onFileSelect: (filePath: string) => void;
}

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const {
    tree,
    rootPath,
    setRootPath,
    loadChildren,
    updateEntryChildren,
    refreshTree,
    isLoading,
  } = useFileTree();
  const { settings, updateSettings } = useSettings();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inlineInput, setInlineInput] = useState<InlineInputMode>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.projectPath && settings.projectPath !== rootPath) {
      setRootPath(settings.projectPath);
    }
  }, [settings.projectPath, rootPath, setRootPath]);

  useEffect(() => {
    if (inlineInput) {
      requestAnimationFrame(() => inlineInputRef.current?.focus());
    }
  }, [inlineInput]);

  useKeyboardShortcuts([
    { key: "p", meta: true, handler: () => setSearchOpen(true) },
  ]);

  const handleOpenFolder = useCallback(async () => {
    const result = await window.kado.dialog.openDirectory();
    if (result.success && result.data) {
      await setRootPath(result.data);
      await updateSettings({ projectPath: result.data });
    }
  }, [setRootPath, updateSettings]);

  const handleLoadChildren = useCallback(
    async (entry: FileEntry) => {
      const children = await loadChildren(entry);
      return children;
    },
    [loadChildren]
  );

  const handleUpdateChildren = useCallback(
    (path: string, children: FileEntry[]) => {
      updateEntryChildren(path, children);
    },
    [updateEntryChildren]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  }, []);

  const handleNewFile = useCallback(async (name: string, parentPath: string) => {
    if (!name.trim()) return;
    const fullPath = parentPath.endsWith("/")
      ? `${parentPath}${name}`
      : `${parentPath}/${name}`;
    await window.kado.fs.writeFile(fullPath, "");
    await refreshTree();
  }, [refreshTree]);

  const handleRename = useCallback(async (newName: string, oldPath: string) => {
    if (!newName.trim()) return;
    const parts = oldPath.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");
    await window.kado.fs.rename(oldPath, newPath);
    await refreshTree();
  }, [refreshTree]);

  const handleDelete = useCallback(async (path: string) => {
    await window.kado.fs.delete(path);
    setConfirmDelete(null);
    await refreshTree();
  }, [refreshTree]);

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path);
  }, []);

  const handleContextAction = useCallback(
    (action: ContextMenuAction) => {
      const entry = contextMenu?.entry;
      setContextMenu(null);
      if (!entry) return;

      switch (action) {
        case "newFile": {
          const parentPath = entry.isDirectory ? entry.path : entry.path.split("/").slice(0, -1).join("/");
          setInlineInput({ kind: "newFile", parentPath });
          break;
        }
        case "rename":
          setInlineInput({ kind: "rename", oldPath: entry.path, currentName: entry.name });
          break;
        case "delete":
          setConfirmDelete({ path: entry.path, name: entry.name });
          break;
        case "copyPath":
          handleCopyPath(entry.path);
          break;
        case "newFolder": {
          const parentPath = entry.isDirectory ? entry.path : entry.path.split("/").slice(0, -1).join("/");
          const folderName = prompt("Folder name:");
          if (folderName?.trim()) {
            const fullPath = parentPath.endsWith("/")
              ? `${parentPath}${folderName}`
              : `${parentPath}/${folderName}`;
            window.kado.fs.mkdir(fullPath).then(() => refreshTree());
          }
          break;
        }
      }
    },
    [contextMenu, handleCopyPath, refreshTree]
  );

  const handleInlineInputSubmit = useCallback(
    (value: string) => {
      if (!inlineInput) return;
      if (inlineInput.kind === "newFile") {
        handleNewFile(value, inlineInput.parentPath);
      } else if (inlineInput.kind === "rename") {
        handleRename(value, inlineInput.oldPath);
      }
      setInlineInput(null);
    },
    [inlineInput, handleNewFile, handleRename]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-2 border-b border-line-2">
        <span className="text-sm font-medium text-foreground">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Search files (⌘P)"
            onClick={() => setSearchOpen(true)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-layer-hover transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Refresh"
            onClick={refreshTree}
            disabled={!rootPath || isLoading}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-layer-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!rootPath ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 animate-fade-in">
          <button
            type="button"
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 hover:border-primary/50 transition-all duration-150"
          >
            <FolderOpen className="w-4 h-4" />
            Open Folder
          </button>
        </div>
      ) : (
        <>
          {inlineInput && (
            <div className="px-3 py-2 border-b border-line-2 bg-surface/30">
              <label className="block text-xs text-muted-foreground mb-1">
                {inlineInput.kind === "newFile" ? "New file name:" : "Rename to:"}
              </label>
              <input
                ref={inlineInputRef}
                type="text"
                defaultValue={inlineInput.kind === "rename" ? inlineInput.currentName : ""}
                className="w-full px-2 py-1 rounded border border-line-2 bg-background text-sm text-foreground focus:outline-none focus:border-primary/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInlineInputSubmit(e.currentTarget.value);
                  } else if (e.key === "Escape") {
                    setInlineInput(null);
                  }
                }}
                onBlur={(e) => {
                  const val = e.currentTarget.value.trim();
                  if (val) handleInlineInputSubmit(val);
                  else setInlineInput(null);
                }}
              />
            </div>
          )}

          <div className="flex-1 overflow-auto py-1">
            {isLoading && tree.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <FileTree
                entries={tree}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                onFileOpen={onFileSelect}
                onLoadChildren={handleLoadChildren}
                onUpdateChildren={handleUpdateChildren}
                onContextMenu={handleContextMenu}
              />
            )}
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-line-2 bg-card shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Delete &ldquo;{confirmDelete.name}&rdquo;?
              </h3>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. The file will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line-2 bg-surface/10">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-layer-hover border border-line-2 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete.path)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-destructive hover:brightness-110 transition-all duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      <FuzzySearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        files={tree}
        onFileSelect={(path) => {
          onFileSelect(path);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}
