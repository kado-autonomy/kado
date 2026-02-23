import { useState, useCallback, useMemo } from 'react';

export type DebugEventKind =
  | 'stateChange'
  | 'progress'
  | 'message'
  | 'error'
  | 'complete'
  | 'toolCall'
  | 'toolResult'
  | 'fileChanges'
  | 'planCreated'
  | 'verificationProgress'
  | 'stepComplete'
  | 'debug'
  | 'worktreeDiff'
  | 'worktreeAccepted'
  | 'worktreeRejected';

export interface DebugEvent {
  id: string;
  kind: DebugEventKind;
  payload: unknown;
  timestamp: number;
}

export interface PlanStepStatus {
  id: string;
  toolName: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  duration?: number;
}

export interface DebugStoreState {
  enabled: boolean;
  events: DebugEvent[];
  planSteps: PlanStepStatus[];
  stateHistory: Array<{ from: string; to: string; timestamp: number }>;
  filterKinds: Set<DebugEventKind> | null;
}

export function useDebugStore() {
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [planSteps, setPlanSteps] = useState<PlanStepStatus[]>([]);
  const [stateHistory, setStateHistory] = useState<Array<{ from: string; to: string; timestamp: number }>>([]);
  const [filterKinds, setFilterKinds] = useState<Set<DebugEventKind> | null>(null);

  const pushEvent = useCallback((kind: DebugEventKind, payload: unknown) => {
    const entry: DebugEvent = {
      id: crypto.randomUUID(),
      kind,
      payload,
      timestamp: Date.now(),
    };
    setEvents((prev) => [...prev, entry]);

    if (kind === 'stateChange') {
      const { from, to } = payload as { from: string; to: string };
      setStateHistory((prev) => [...prev, { from, to, timestamp: entry.timestamp }]);
    }

    if (kind === 'planCreated') {
      const { steps } = payload as { steps: Array<{ id: string; toolName: string; description: string }> };
      setPlanSteps(steps.map((s) => ({ ...s, status: 'pending' as const })));
    }

    if (kind === 'toolCall') {
      const { toolName } = payload as { toolName: string };
      setPlanSteps((prev) =>
        prev.map((s) =>
          s.toolName === toolName && s.status === 'pending'
            ? { ...s, status: 'running' as const }
            : s
        )
      );
    }

    if (kind === 'stepComplete') {
      const { stepId, success, duration } = payload as { stepId: string; success: boolean; duration: number };
      setPlanSteps((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? { ...s, status: success ? 'complete' as const : 'failed' as const, duration }
            : s
        )
      );
    }
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    setPlanSteps([]);
    setStateHistory([]);
  }, []);

  const filteredEvents = useMemo(() => {
    if (!filterKinds || filterKinds.size === 0) return events;
    return events.filter((e) => filterKinds.has(e.kind));
  }, [events, filterKinds]);

  const exportLog = useCallback(() => {
    const blob = new Blob([JSON.stringify({ events, planSteps, stateHistory }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kado-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events, planSteps, stateHistory]);

  return {
    enabled,
    setEnabled,
    events,
    filteredEvents,
    planSteps,
    stateHistory,
    filterKinds,
    setFilterKinds,
    pushEvent,
    clear,
    exportLog,
  };
}
