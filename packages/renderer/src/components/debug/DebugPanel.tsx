import { useState, useRef, useEffect, useMemo } from 'react';
import { Bug, Download, Trash2, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import type { DebugEvent, DebugEventKind, PlanStepStatus } from '@/hooks/useDebugStore';

interface DebugPanelProps {
  events: DebugEvent[];
  filteredEvents: DebugEvent[];
  planSteps: PlanStepStatus[];
  stateHistory: Array<{ from: string; to: string; timestamp: number }>;
  filterKinds: Set<DebugEventKind> | null;
  onFilterChange: (kinds: Set<DebugEventKind> | null) => void;
  onClear: () => void;
  onExport: () => void;
}

type DebugTab = 'timeline' | 'plan' | 'events' | 'state';

const KIND_COLORS: Record<string, string> = {
  stateChange: 'text-blue-400',
  progress: 'text-cyan-400',
  message: 'text-foreground',
  error: 'text-red-400',
  complete: 'text-green-400',
  toolCall: 'text-yellow-400',
  toolResult: 'text-amber-400',
  fileChanges: 'text-purple-400',
  planCreated: 'text-indigo-400',
  verificationProgress: 'text-teal-400',
  stepComplete: 'text-emerald-400',
  debug: 'text-muted-foreground',
};

const STEP_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted-foreground/20 text-muted-foreground',
  running: 'bg-primary/20 text-primary animate-pulse',
  complete: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncatePayload(payload: unknown, maxLen = 200): string {
  const str = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
}

function TimelineEntry({ event }: { event: DebugEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-line-2 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3 py-1.5 text-xs hover:bg-surface/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="w-3 h-3 mt-0.5 shrink-0" /> : <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />}
        <span className="text-muted-foreground shrink-0 font-mono">{formatTime(event.timestamp)}</span>
        <span className={`font-medium shrink-0 ${KIND_COLORS[event.kind] ?? 'text-foreground'}`}>
          {event.kind}
        </span>
        <span className="text-muted-foreground truncate">
          {truncatePayload(event.payload, 120)}
        </span>
      </button>
      {expanded && (
        <pre className="px-8 py-2 text-xs text-muted-foreground bg-surface/30 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function PlanInspector({ steps }: { steps: PlanStepStatus[] }) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No active plan
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface/50"
        >
          <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STEP_STATUS_STYLES[step.status]}`}>
            {step.status.toUpperCase()}
          </span>
          <span className="text-xs font-medium text-primary shrink-0">{step.toolName}</span>
          <span className="text-xs text-foreground truncate">{step.description}</span>
          {step.duration != null && (
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
              {formatDuration(step.duration)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function StateTimeline({ history }: { history: Array<{ from: string; to: string; timestamp: number }> }) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No state transitions recorded
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1">
      {history.map((entry, i) => (
        <div key={`${entry.timestamp}-${i}`} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-mono shrink-0">{formatTime(entry.timestamp)}</span>
          <span className="text-blue-400">{entry.from}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-green-400">{entry.to}</span>
        </div>
      ))}
    </div>
  );
}

const ALL_KINDS: DebugEventKind[] = [
  'stateChange', 'progress', 'message', 'error', 'complete',
  'toolCall', 'toolResult', 'fileChanges', 'planCreated',
  'verificationProgress', 'stepComplete', 'debug',
];

export function DebugPanel({
  filteredEvents,
  planSteps,
  stateHistory,
  filterKinds,
  onFilterChange,
  onClear,
  onExport,
}: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<DebugTab>('timeline');
  const [showFilter, setShowFilter] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents.length]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filteredEvents) {
      counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    }
    return counts;
  }, [filteredEvents]);

  const tabs: Array<{ id: DebugTab; label: string; count?: number }> = [
    { id: 'timeline', label: 'Timeline', count: filteredEvents.length },
    { id: 'plan', label: 'Plan', count: planSteps.length || undefined },
    { id: 'events', label: 'Events', count: filteredEvents.length },
    { id: 'state', label: 'States', count: stateHistory.length || undefined },
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-line-2 bg-card">
        <div className="flex items-center gap-1">
          <Bug className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Debug</span>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`ml-1 px-2 py-1 text-[11px] rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowFilter(!showFilter)}
            className={`p-1 rounded transition-colors ${showFilter ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label="Toggle filters"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onExport} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" aria-label="Export debug log">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClear} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors" aria-label="Clear debug log">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-line-2 bg-surface/30">
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              filterKinds === null ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {ALL_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                const next = new Set(filterKinds ?? ALL_KINDS);
                if (next.has(kind)) next.delete(kind);
                else next.add(kind);
                onFilterChange(next.size === ALL_KINDS.length ? null : next);
              }}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                filterKinds === null || filterKinds.has(kind)
                  ? `${KIND_COLORS[kind]} bg-surface`
                  : 'text-muted-foreground/40 line-through'
              }`}
            >
              {kind}
              {eventCounts[kind] != null && (
                <span className="ml-0.5 opacity-60">{eventCounts[kind]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        {activeTab === 'timeline' && (
          filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No events recorded yet
            </div>
          ) : (
            filteredEvents.map((event) => (
              <TimelineEntry key={event.id} event={event} />
            ))
          )
        )}
        {activeTab === 'plan' && <PlanInspector steps={planSteps} />}
        {activeTab === 'events' && (
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {ALL_KINDS.map((kind) => (
                <div key={kind} className="flex items-center justify-between px-2 py-1 rounded bg-surface/50 text-xs">
                  <span className={KIND_COLORS[kind]}>{kind}</span>
                  <span className="font-mono text-muted-foreground">{eventCounts[kind] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'state' && <StateTimeline history={stateHistory} />}
      </div>
    </div>
  );
}
