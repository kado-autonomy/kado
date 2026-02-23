import { FileCode2, X } from "lucide-react";
import clsx from "clsx";
import type { EditorTab } from "@/hooks/useEditorTabs";

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabSelect, onTabClose }: TabBarProps) {
  return (
    <div className="flex items-center overflow-x-auto border-b border-line-2 bg-card scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            tabIndex={0}
            onClick={() => onTabSelect(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onTabClose(tab.id);
            }}
            className={clsx(
              "group flex items-center gap-2 min-w-0 max-w-[200px] px-3 py-2 border-r border-line-1 cursor-pointer transition-colors duration-150",
              isActive
                ? "bg-background text-foreground border-b-2 border-b-primary"
                : "text-muted-foreground hover:bg-layer-hover hover:text-muted-foreground-2"
            )}
          >
            <FileCode2 className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{tab.fileName}</span>
            {tab.isDirty && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Modified" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={clsx(
                "shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                "hover:bg-surface text-muted-foreground hover:text-foreground"
              )}
              aria-label={`Close ${tab.fileName}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
