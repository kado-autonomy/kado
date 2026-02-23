import { useImperativeHandle, useRef, forwardRef, useCallback, useEffect } from "react";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { TabBar } from "./TabBar";
import { MonacoWrapper } from "./MonacoWrapper";
import { DiffViewer } from "./DiffViewer";
import { ToriiLogo } from "@/components/mascot";

export interface CodeEditorRef {
  openFile: (path: string) => Promise<void>;
  getCurrentContent: () => string | null;
}

interface CodeEditorProps {
  diffMode?: boolean;
}

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  function CodeEditor({ diffMode = false }, ref) {
    const {
      tabs,
      activeTab,
      activeTabId,
      openFile,
      closeTab,
      saveTab,
      updateContent,
      setActiveTab,
    } = useEditorTabs();

    const openFileRef = useRef(openFile);
    openFileRef.current = openFile;

    useImperativeHandle(
      ref,
      () => ({
        openFile: (path: string) => openFileRef.current(path),
        getCurrentContent: () => activeTab?.content ?? null,
      }),
      [activeTab?.content]
    );

    const handleSave = useCallback(() => {
      if (activeTabId) saveTab(activeTabId);
    }, [activeTabId, saveTab]);

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          handleSave();
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [handleSave]);

    return (
      <div className="flex flex-col h-full bg-background">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={(id) => setActiveTab(id)}
          onTabClose={closeTab}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab ? (
            diffMode ? (
              <DiffViewer
                original={activeTab.originalContent}
                modified={activeTab.content}
                language={activeTab.language}
              />
            ) : (
              <MonacoWrapper
                content={activeTab.content}
                language={activeTab.language}
                onChange={(value) => updateContent(activeTab.id, value)}
                onSave={handleSave}
                readOnly={false}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
              <ToriiLogo size="lg" className="opacity-15" />
              <p className="text-muted-foreground text-sm">Open a file to start editing</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
