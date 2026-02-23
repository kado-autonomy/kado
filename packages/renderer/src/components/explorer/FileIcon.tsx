import {
  FileCode,
  FileJson,
  FileText,
  File,
  Folder,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

const EXTENSION_MAP: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileJson,
  md: FileText,
  txt: FileText,
};

function getExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  return lastDot >= 0 ? name.slice(lastDot + 1).toLowerCase() : "";
}

interface FileIconProps {
  name: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  className?: string;
}

export function FileIcon({ name, isDirectory, isOpen, className = "w-4 h-4" }: FileIconProps) {
  if (isDirectory) {
    const DirIcon = isOpen ? FolderOpen : Folder;
    return <DirIcon className={`${className} text-amber-500/90`} />;
  }

  const ext = getExtension(name);
  const Icon = EXTENSION_MAP[ext] ?? File;

  const colorClass =
    ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx"
      ? "text-blue-400/90"
      : ext === "json"
        ? "text-amber-400/90"
        : ext === "md" || ext === "txt"
          ? "text-muted-foreground"
          : "text-muted-foreground/70";

  return <Icon className={`${className} ${colorClass}`} />;
}

export function getFileIcon(name: string, isDirectory?: boolean, isOpen?: boolean): LucideIcon {
  if (isDirectory) return isOpen ? FolderOpen : Folder;
  const ext = getExtension(name);
  return EXTENSION_MAP[ext] ?? File;
}
