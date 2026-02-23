import { Settings, PanelLeft, PanelBottom, Bug } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { KadoMascot } from '@/components/mascot/KadoMascot';
import { ToriiLogo } from '../mascot/ToriiLogo';

interface ToolbarProps {
  onToggleSidebar?: () => void;
  onToggleBottomPanel?: () => void;
  onOpenSettings?: () => void;
  debugEnabled?: boolean;
  onToggleDebug?: () => void;
}

export function Toolbar({ onToggleSidebar, onToggleBottomPanel, onOpenSettings, debugEnabled, onToggleDebug }: ToolbarProps) {
  const { settings } = useSettings();

  const projectName = settings.projectPath
    ? settings.projectPath.split('/').filter(Boolean).pop() ?? 'Project'
    : null;

  return (
    <div className="relative flex h-12 items-center justify-between px-4 bg-navbar">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-navbar-nav-foreground/60 hover:bg-navbar-nav-hover hover:text-navbar-nav-foreground transition-colors duration-150"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-line-2">
            <ToriiLogo size="xsm" />
            <span className="font-bold text-lg text-foreground tracking-tight">Kado</span>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">v2</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground-2">
          {projectName ?? <span className="text-muted-foreground">No project open</span>}
        </span>
        {onToggleDebug && (
          <button
            type="button"
            onClick={onToggleDebug}
            className={`p-1.5 rounded-lg transition-colors duration-150 ${
              debugEnabled
                ? 'bg-primary/15 text-primary'
                : 'text-navbar-nav-foreground/60 hover:bg-navbar-nav-hover hover:text-navbar-nav-foreground'
            }`}
            aria-label="Toggle debug panel"
          >
            <Bug className="w-4 h-4" />
          </button>
        )}
        {onToggleBottomPanel && (
          <button
            type="button"
            onClick={onToggleBottomPanel}
            className="p-1.5 rounded-lg text-navbar-nav-foreground/60 hover:bg-navbar-nav-hover hover:text-navbar-nav-foreground transition-colors duration-150"
            aria-label="Toggle bottom panel"
          >
            <PanelBottom className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-navbar-nav-foreground/60 hover:bg-navbar-nav-hover hover:text-navbar-nav-foreground transition-colors duration-150"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
