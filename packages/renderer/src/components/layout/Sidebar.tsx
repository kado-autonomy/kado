import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Search, Users } from 'lucide-react';
import clsx from 'clsx';
import { FileExplorer } from '@/components/explorer/FileExplorer';
import { SubagentViewer } from '@/components/subagents/SubagentViewer';
import type { SubagentInfo } from '@/components/subagents/types';

type TabId = 'explorer' | 'search' | 'subagents';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'explorer', label: 'File Explorer', icon: FileText },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'subagents', label: 'Subagents', icon: Users },
];

interface SidebarProps {
  onFileSelect?: (filePath: string) => void;
}

export function Sidebar({ onFileSelect }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('explorer');
  const [subagents, setSubagents] = useState<SubagentInfo[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSubagents = useCallback(async () => {
    if (!window.kado?.orchestrator?.listSubagents) return;
    try {
      const result = await window.kado.orchestrator.listSubagents();
      if (result.success && result.data) {
        setSubagents(result.data as SubagentInfo[]);
      }
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'subagents') {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    fetchSubagents();
    pollRef.current = setInterval(fetchSubagents, 2000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeTab, fetchSubagents]);

  const handleKillSubagent = useCallback(async (id: string) => {
    if (!window.kado?.orchestrator?.killSubagent) return;
    await window.kado.orchestrator.killSubagent(id);
    fetchSubagents();
  }, [fetchSubagents]);

  return (
    <div className="flex h-full bg-sidebar">
      <div className="flex flex-col w-12 border-r border-sidebar-line">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            title={label}
            className={clsx(
              'relative flex items-center justify-center w-12 h-12 transition-colors duration-150',
              activeTab === id
                ? 'text-primary bg-sidebar-nav-active'
                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-nav-hover',
            )}
          >
            <Icon className="w-5 h-5" />
            {activeTab === id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-primary rounded-r" />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
        {activeTab === 'explorer' && <FileExplorer onFileSelect={onFileSelect ?? (() => {})} />}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="rounded-lg border border-line-2 bg-surface/50 p-4 text-sm text-muted-foreground">
              Semantic search coming soon
            </div>
          </div>
        )}
        {activeTab === 'subagents' && (
          <SubagentViewer subagents={subagents} onKill={handleKillSubagent} />
        )}
      </div>
    </div>
  );
}
