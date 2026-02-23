import { Square, MessageSquare, FolderOpen, PanelLeft, PanelBottom, Save, Undo, Redo, Search } from "lucide-react";

interface ShortcutItem {
  action: string;
  keys: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const NAVIGATION: ShortcutItem[] = [
  { action: "Toggle sidebar", keys: "⌘B", icon: PanelLeft },
  { action: "Toggle bottom panel", keys: "⌘J", icon: PanelBottom },
  { action: "Open file/folder", keys: "⌘O", icon: FolderOpen },
];

const EDITING: ShortcutItem[] = [
  { action: "Save", keys: "⌘S", icon: Save },
  { action: "Undo", keys: "⌘Z", icon: Undo },
  { action: "Redo", keys: "⌘⇧Z", icon: Redo },
  { action: "Find", keys: "⌘F", icon: Search },
];

const AGENT: ShortcutItem[] = [
  { action: "Send message", keys: "Enter", icon: MessageSquare },
  { action: "Stop generation", keys: "⌘.", icon: Square },
  { action: "New chat", keys: "⌘N", icon: MessageSquare },
];

function ShortcutRow({ action, keys, icon: Icon }: ShortcutItem) {
  return (
    <tr className="border-b border-line-2 last:border-0">
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm text-foreground">{action}</span>
        </div>
      </td>
      <td className="py-2.5 text-right">
        <kbd className="inline-flex items-center rounded border border-line-2 bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground-2">
          {keys}
        </kbd>
      </td>
    </tr>
  );
}

function ShortcutSection({ title, items }: { title: string; items: ShortcutItem[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <table className="w-full">
        <tbody>
          {items.map((item) => (
            <ShortcutRow key={item.action} {...item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ShortcutsPanel() {
  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-foreground mb-4">Keyboard Shortcuts</h2>
      <ShortcutSection title="Navigation" items={NAVIGATION} />
      <ShortcutSection title="Editing" items={EDITING} />
      <ShortcutSection title="Agent" items={AGENT} />
    </div>
  );
}
