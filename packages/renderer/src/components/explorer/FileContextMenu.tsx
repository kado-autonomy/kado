import { useEffect, useRef } from "react";
import { FilePlus, FolderPlus, Pencil, Trash2, Copy } from "lucide-react";

export type ContextMenuAction = "newFile" | "newFolder" | "rename" | "delete" | "copyPath";

interface FileContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: ContextMenuAction) => void;
}

const ACTIONS: { id: ContextMenuAction; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "newFile", label: "New File", icon: FilePlus },
  { id: "newFolder", label: "New Folder", icon: FolderPlus },
  { id: "rename", label: "Rename", icon: Pencil },
  { id: "delete", label: "Delete", icon: Trash2 },
  { id: "copyPath", label: "Copy Path", icon: Copy },
];

export function FileContextMenu({ x, y, onClose, onAction }: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] py-1 rounded-md border border-line-2 bg-card shadow-lg"
      style={{ left: x, top: y }}
    >
      {ACTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-layer-hover transition-colors"
          onClick={() => {
            onAction(id);
            onClose();
          }}
        >
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </button>
      ))}
    </div>
  );
}
