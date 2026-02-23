import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { ResizablePanel } from './ResizablePanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { DiffPanel } from '@/components/diff/DiffPanel';
import type { FileChange } from '@/components/diff/DiffPanel';
import { ResultsConsole } from '@/components/console/ResultsConsole';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { useChatHistory } from '@/hooks/useChatHistory';
import type { FileChangeInfo } from '@/hooks/useChatHistory';
import { useConsole } from '@/hooks/useConsole';
import { useDebugStore } from '@/hooks/useDebugStore';
import type { DebugEventKind } from '@/hooks/useDebugStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSettings } from '@/hooks/useSettings';

type BottomPanelTab = 'console' | 'debug';

interface PanelVisibility {
  sidebar: boolean;
  bottomPanel: boolean;
  chat: boolean;
}

export function Layout() {
  const editorRef = useRef<{ openFile: (path: string) => void } | null>(null);
  const [panels, setPanels] = useState<PanelVisibility>({
    sidebar: true,
    bottomPanel: true,
    chat: true,
  });
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>('console');
  const [showSettings, setShowSettings] = useState(false);
  const [showDiffPanel, setShowDiffPanel] = useState(false);
  const [pendingFileChanges, setPendingFileChanges] = useState<FileChange[]>([]);
  const { settings } = useSettings();

  const sessionId = 'default-session';
  const { messages, addMessage, updateMessage, clearHistory, isStreaming } = useChatHistory(sessionId);
  const consoleState = useConsole();
  const debugStore = useDebugStore();
  const [orchestratorState, setOrchestratorState] = useState<string>('idle');
  const [stepProgress, setStepProgress] = useState<string | undefined>(undefined);
  const streamingIdRef = useRef<string | null>(null);
  const lastToolCallMsgIdRef = useRef<string | null>(null);
  const worktreeDiffMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!window.kado?.orchestrator?.onEvent) return;

    const unsubscribe = window.kado.orchestrator.onEvent((event) => {
      debugStore.pushEvent(event.kind as DebugEventKind, event.payload);

      switch (event.kind) {
        case 'stateChange': {
          const { from, to } = event.payload as { from: string; to: string };
          setOrchestratorState(to);
          if (to === 'idle' || to === 'complete' || to === 'error') {
            setStepProgress(undefined);
          }
          consoleState.addEntry({
            type: 'info',
            content: `State: ${from} → ${to}`,
            timestamp: Date.now(),
          });
          break;
        }
        case 'message': {
          const { type, content } = event.payload as { type: string; content: string };
          if (type === 'assistant') {
            if (streamingIdRef.current) {
              updateMessage(streamingIdRef.current, { content, isStreaming: false });
              streamingIdRef.current = null;
            } else {
              addMessage({ role: 'assistant', content });
            }
          } else if (type === 'system') {
            addMessage({ role: 'system', content });
          }
          break;
        }
        case 'error': {
          const { message, stack } = event.payload as { message: string; code?: string; stack?: string };
          if (streamingIdRef.current) {
            updateMessage(streamingIdRef.current, { content: `Error: ${message}`, isStreaming: false });
            streamingIdRef.current = null;
          } else {
            addMessage({ role: 'system', content: `Error: ${message}` });
          }
          consoleState.addEntry({
            type: 'stderr',
            content: stack ? `${message}\n${stack}` : message,
            timestamp: Date.now(),
          });
          break;
        }
        case 'complete': {
          const { success } = event.payload as { success: boolean };
          if (streamingIdRef.current) {
            updateMessage(streamingIdRef.current, { isStreaming: false });
            streamingIdRef.current = null;
          }
          consoleState.addEntry({
            type: 'info',
            content: success ? 'Task completed successfully' : 'Task completed with errors',
            timestamp: Date.now(),
          });
          break;
        }
        case 'progress': {
          const { step, progress, message: progressMsg } = event.payload as { step: string; progress: number; message?: string };
          if (streamingIdRef.current && progressMsg) {
            updateMessage(streamingIdRef.current, { content: progressMsg });
          }
          if (progressMsg) {
            consoleState.addEntry({
              type: 'info',
              content: `[${progress}%] ${progressMsg}`,
              timestamp: Date.now(),
            });
          }
          break;
        }
        case 'toolCall': {
          const { toolName, args } = event.payload as { toolName: string; args: Record<string, unknown> };
          const argsPreview = Object.entries(args)
            .map(([k, v]) => {
              const val = typeof v === 'string' && v.length > 80 ? `${v.slice(0, 80)}...` : JSON.stringify(v);
              return `${k}=${val}`;
            })
            .join(', ');
          consoleState.addEntry({
            type: 'command',
            content: `${toolName}(${argsPreview})`,
            timestamp: Date.now(),
          });
          const toolCallMsgId = addMessage({
            role: 'system',
            content: `Running tool: **${toolName}**`,
            type: 'tool-call',
            meta: { toolName, args },
          });
          lastToolCallMsgIdRef.current = toolCallMsgId;
          break;
        }
        case 'toolResult': {
          const { toolName, success, result } = event.payload as { toolName: string; success: boolean; result?: unknown };
          const resultStr = result != null
            ? (typeof result === 'string' ? result : JSON.stringify(result, null, 2))
            : '';
          const preview = resultStr.length > 500 ? `${resultStr.slice(0, 500)}...` : resultStr;
          consoleState.addEntry({
            type: success ? 'stdout' : 'stderr',
            content: success
              ? `${toolName} succeeded${preview ? `:\n${preview}` : ''}`
              : `${toolName} failed${preview ? `: ${preview}` : ''}`,
            timestamp: Date.now(),
          });
          if (lastToolCallMsgIdRef.current) {
            updateMessage(lastToolCallMsgIdRef.current, {
              meta: { completed: true, success },
            });
            lastToolCallMsgIdRef.current = null;
          }
          break;
        }
        case 'fileChanges': {
          const { changes } = event.payload as { changes: FileChangeInfo[] };
          if (changes && changes.length > 0) {
            const diffChanges: FileChange[] = changes.map((c) => ({
              filePath: c.filePath,
              original: c.original,
              modified: c.modified,
              language: c.language,
              status: c.status,
            }));
            setPendingFileChanges((prev) => [...prev, ...diffChanges]);

            addMessage({
              role: 'assistant',
              content: '',
              type: 'change-summary',
              meta: { fileChanges: changes },
            });

            for (const c of changes) {
              consoleState.addEntry({
                type: 'info',
                content: `File ${c.status}: ${c.filePath}`,
                timestamp: Date.now(),
              });
            }
          }
          break;
        }
        case 'planCreated': {
          const { title, steps } = event.payload as {
            planId: string;
            title: string;
            steps: Array<{ id: string; toolName: string; description: string; dependsOn: string[] }>;
          };
          const stepList = steps.map((s, i) => `${i + 1}. ${s.description} (${s.toolName})`).join('\n');
          addMessage({
            role: 'system',
            content: `**Plan: ${title}**\n\n${stepList}`,
            type: 'plan-created',
            meta: { title, steps },
          });
          consoleState.addEntry({
            type: 'info',
            content: `Plan created: "${title}" with ${steps.length} step(s)`,
            timestamp: Date.now(),
          });
          break;
        }
        case 'verificationProgress': {
          const { phase, status, details } = event.payload as {
            phase: 'build' | 'lint' | 'test';
            status: 'running' | 'passed' | 'failed';
            details?: string;
          };
          const icon = status === 'running' ? '...' : status === 'passed' ? 'PASS' : 'FAIL';
          const entryType = phase === 'test' ? 'test-result' as const : phase === 'lint' ? 'lint-result' as const : 'info' as const;
          consoleState.addEntry({
            type: entryType,
            content: `[${icon}] ${phase}: ${details ?? status}`,
            timestamp: Date.now(),
          });
          break;
        }
        case 'stepComplete': {
          const { stepIndex, totalSteps, success, duration, toolName, description } = event.payload as {
            stepId: string;
            stepIndex: number;
            totalSteps: number;
            success: boolean;
            duration: number;
            toolName: string;
            description: string;
          };
          const nextStep = stepIndex + 1;
          if (nextStep < totalSteps) {
            setStepProgress(`Step ${nextStep + 1}/${totalSteps}`);
          } else {
            setStepProgress(`${totalSteps}/${totalSteps} steps done`);
          }
          consoleState.addEntry({
            type: success ? 'stdout' : 'stderr',
            content: `Step ${stepIndex + 1}/${totalSteps} ${success ? 'completed' : 'failed'}: ${description} (${toolName}, ${duration}ms)`,
            timestamp: Date.now(),
          });
          break;
        }
        case 'debug': {
          const { level, source, message: debugMsg } = event.payload as {
            level: string;
            source: string;
            message: string;
            data?: unknown;
            timestamp: number;
          };
          if (level !== 'trace') {
            consoleState.addEntry({
              type: 'info',
              content: `[${level.toUpperCase()}] ${source}: ${debugMsg}`,
              timestamp: Date.now(),
            });
          }
          break;
        }
        case 'worktreeDiff': {
          const { taskId, branch, files } = event.payload as {
            taskId: string;
            branch: string;
            files: Array<{
              path: string;
              status: string;
              original: string;
              modified: string;
              additions: number;
              deletions: number;
            }>;
          };
          const diffMsgId = addMessage({
            role: 'assistant',
            content: '',
            type: 'worktree-diff',
            meta: {
              worktreeDiff: { taskId, branch, files },
            },
          });
          worktreeDiffMsgIdRef.current = diffMsgId;
          consoleState.addEntry({
            type: 'info',
            content: `Worktree diff: ${files.length} file(s) changed on ${branch}`,
            timestamp: Date.now(),
          });
          break;
        }
        case 'worktreeAccepted': {
          if (worktreeDiffMsgIdRef.current) {
            updateMessage(worktreeDiffMsgIdRef.current, {
              meta: { worktreeDiff: { accepted: true } },
            });
            worktreeDiffMsgIdRef.current = null;
          }
          consoleState.addEntry({
            type: 'info',
            content: 'Worktree changes accepted',
            timestamp: Date.now(),
          });
          break;
        }
        case 'worktreeRejected': {
          if (worktreeDiffMsgIdRef.current) {
            updateMessage(worktreeDiffMsgIdRef.current, {
              meta: { worktreeDiff: { rejected: true } },
            });
            worktreeDiffMsgIdRef.current = null;
          }
          consoleState.addEntry({
            type: 'info',
            content: 'Worktree changes rejected',
            timestamp: Date.now(),
          });
          break;
        }
      }
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- consoleState and debugStore are stable refs
  }, [addMessage, updateMessage]);

  const handleFileSelect = useCallback((filePath: string) => {
    editorRef.current?.openFile(filePath);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      addMessage({ role: 'user', content });
      const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true });
      streamingIdRef.current = assistantId;

      if (window.kado?.orchestrator?.sendMessage) {
        const result = await window.kado.orchestrator.sendMessage(content, sessionId);
        if (!result.success) {
          updateMessage(assistantId, {
            content: result.error ?? 'Failed to send message to orchestrator',
            isStreaming: false,
          });
          streamingIdRef.current = null;
        }
      } else {
        updateMessage(assistantId, {
          content: 'Orchestrator not available. Running in UI-only mode.',
          isStreaming: false,
        });
        streamingIdRef.current = null;
      }
    },
    [addMessage, updateMessage, sessionId],
  );

  const handleClarifyingAnswer = useCallback(
    (answer: string) => {
      handleSendMessage(answer);
    },
    [handleSendMessage],
  );

  const handleAbort = useCallback(() => {
    window.kado?.orchestrator?.abort();
    if (streamingIdRef.current) {
      updateMessage(streamingIdRef.current, { content: 'Aborted.', isStreaming: false });
      streamingIdRef.current = null;
    }
  }, [updateMessage]);

  const handleAcceptAllChanges = useCallback((changes?: FileChangeInfo[]) => {
    if (changes) {
      const paths = new Set(changes.map((c) => c.filePath));
      setPendingFileChanges((prev) => prev.filter((c) => !paths.has(c.filePath)));
    } else {
      setPendingFileChanges([]);
    }
    setShowDiffPanel(false);
  }, []);

  const handleRejectAllChanges = useCallback(async (changes?: FileChangeInfo[]) => {
    const toRevert = changes ?? pendingFileChanges;
    for (const change of toRevert) {
      if (change.status !== 'added' && change.original) {
        await window.kado?.fs?.writeFile(change.filePath, change.original);
      } else if (change.status === 'added') {
        await window.kado?.fs?.delete(change.filePath);
      }
    }
    if (changes) {
      const paths = new Set(changes.map((c) => c.filePath));
      setPendingFileChanges((prev) => prev.filter((c) => !paths.has(c.filePath)));
    } else {
      setPendingFileChanges([]);
    }
    setShowDiffPanel(false);
  }, [pendingFileChanges]);

  const handleAcceptSingleChange = useCallback((file: FileChange) => {
    setPendingFileChanges((prev) => prev.filter((c) => c.filePath !== file.filePath));
  }, []);

  const handleRejectSingleChange = useCallback(async (file: FileChange) => {
    if (file.status !== 'added' && file.original) {
      await window.kado?.fs?.writeFile(file.filePath, file.original);
    } else if (file.status === 'added') {
      await window.kado?.fs?.delete(file.filePath);
    }
    setPendingFileChanges((prev) => prev.filter((c) => c.filePath !== file.filePath));
  }, []);

  const handleViewFullDiff = useCallback((changes?: FileChangeInfo[]) => {
    if (changes) {
      const paths = new Set(changes.map((c) => c.filePath));
      const alreadyTracked = pendingFileChanges.filter((c) => paths.has(c.filePath));
      if (alreadyTracked.length === 0) {
        const diffChanges: FileChange[] = changes.map((c) => ({
          filePath: c.filePath,
          original: c.original,
          modified: c.modified,
          language: c.language,
          status: c.status,
        }));
        setPendingFileChanges((prev) => [...prev, ...diffChanges]);
      }
    }
    setShowDiffPanel(true);
  }, [pendingFileChanges]);

  const handleWorktreeAccept = useCallback(async (taskId: string) => {
    if (window.kado?.worktree?.accept) {
      const result = await window.kado.worktree.accept(taskId);
      if (!result.success) {
        addMessage({ role: 'system', content: `Failed to accept changes: ${result.error}` });
      }
    }
  }, [addMessage]);

  const handleWorktreeReject = useCallback(async (taskId: string) => {
    if (window.kado?.worktree?.reject) {
      const result = await window.kado.worktree.reject(taskId);
      if (!result.success) {
        addMessage({ role: 'system', content: `Failed to reject changes: ${result.error}` });
      }
    }
  }, [addMessage]);

  const handleOpenFile = useCallback((filePath: string) => {
    editorRef.current?.openFile(filePath);
  }, []);

  const togglePanel = useCallback((panel: keyof PanelVisibility) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  const shortcuts = useMemo(
    () => [
      { key: 'b', meta: true, handler: () => togglePanel('sidebar') },
      { key: 'j', meta: true, handler: () => togglePanel('bottomPanel') },
      { key: 'e', meta: true, shift: true, handler: () => togglePanel('sidebar') },
    ],
    [togglePanel],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="flex-shrink-0 border-b border-navbar-line">
        <Toolbar
          onToggleSidebar={() => togglePanel('sidebar')}
          onToggleBottomPanel={() => togglePanel('bottomPanel')}
          onOpenSettings={() => setShowSettings(true)}
          debugEnabled={debugStore.enabled}
          onToggleDebug={() => {
            debugStore.setEnabled(!debugStore.enabled);
            if (!debugStore.enabled) {
              setPanels((prev) => ({ ...prev, bottomPanel: true }));
              setBottomTab('debug');
            }
          }}
        />
      </header>

      <div className="flex flex-1 min-h-0">
        {panels.sidebar && (
          <ResizablePanel
            direction="horizontal"
            initialSize={260}
            minSize={200}
            maxSize={480}
            resizerPosition="end"
          >
            <Sidebar onFileSelect={handleFileSelect} />
          </ResizablePanel>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 min-w-0">
              {showDiffPanel && pendingFileChanges.length > 0 ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-line-2 bg-card">
                    <span className="text-sm font-medium text-foreground">Review Changes</span>
                    <button
                      type="button"
                      onClick={() => setShowDiffPanel(false)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                      aria-label="Close diff view"
                    >
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <DiffPanel
                      changes={pendingFileChanges}
                      onAccept={handleAcceptSingleChange}
                      onReject={handleRejectSingleChange}
                      onAcceptAll={handleAcceptAllChanges}
                      onRejectAll={handleRejectAllChanges}
                    />
                  </div>
                </div>
              ) : (
                <CodeEditor ref={editorRef} />
              )}
            </div>

            {panels.chat && (
              <ResizablePanel
                direction="horizontal"
                initialSize={360}
                minSize={280}
                maxSize={600}
                resizerPosition="start"
              >
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onClear={clearHistory}
                  onStop={handleAbort}
                  onClarifyingAnswer={handleClarifyingAnswer}
                  onAcceptAllChanges={handleAcceptAllChanges}
                  onRejectAllChanges={handleRejectAllChanges}
                  onViewFullDiff={handleViewFullDiff}
                  onWorktreeAccept={handleWorktreeAccept}
                  onWorktreeReject={handleWorktreeReject}
                  onOpenFile={handleOpenFile}
                  isStreaming={isStreaming}
                  orchestratorState={orchestratorState}
                  stepProgress={stepProgress}
                />
              </ResizablePanel>
            )}
          </div>

          {panels.bottomPanel && (
            <ResizablePanel
              direction="vertical"
              initialSize={200}
              minSize={120}
              maxSize={500}
              resizerPosition="start"
            >
              <div className="flex flex-col h-full bg-background">
                <div className="flex items-center gap-1 px-2 border-b border-line-2 bg-card">
                  <button
                    type="button"
                    onClick={() => setBottomTab('console')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      bottomTab === 'console'
                        ? 'text-foreground border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Console
                  </button>
                  {debugStore.enabled && (
                    <button
                      type="button"
                      onClick={() => setBottomTab('debug')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        bottomTab === 'debug'
                          ? 'text-foreground border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Debug
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {bottomTab === 'console' && (
                    <ResultsConsole
                      entries={consoleState.entries}
                      filteredEntries={consoleState.filteredEntries}
                      onClear={consoleState.clear}
                      activeFilters={consoleState.activeFilters}
                      onFilterChange={consoleState.setFilter}
                      searchQuery={consoleState.searchQuery}
                      onSearchChange={consoleState.setSearchQuery}
                    />
                  )}
                  {bottomTab === 'debug' && debugStore.enabled && (
                    <DebugPanel
                      events={debugStore.events}
                      filteredEvents={debugStore.filteredEvents}
                      planSteps={debugStore.planSteps}
                      stateHistory={debugStore.stateHistory}
                      filterKinds={debugStore.filterKinds}
                      onFilterChange={debugStore.setFilterKinds}
                      onClear={debugStore.clear}
                      onExport={debugStore.exportLog}
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          )}
        </div>
      </div>

      <footer className="flex-shrink-0 border-t border-footer-line">
        <StatusBar
          projectPath={settings.projectPath}
          model={settings.defaultModel}
        />
      </footer>

      {showSettings && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative ml-auto w-full max-w-2xl bg-overlay border-l border-overlay-line shadow-2xl shadow-black/40 animate-fade-in">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Close settings"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
