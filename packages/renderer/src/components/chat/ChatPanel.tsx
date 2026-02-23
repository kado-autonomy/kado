import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Trash2, MessageCircle } from "lucide-react";
import clsx from "clsx";
import type { ChatMessage, FileChangeInfo } from "@/hooks/useChatHistory";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onClear?: () => void;
  onStop?: () => void;
  onClarifyingAnswer?: (answer: string) => void;
  onAcceptAllChanges?: (changes?: FileChangeInfo[]) => void;
  onRejectAllChanges?: (changes?: FileChangeInfo[]) => void;
  onViewFullDiff?: (changes?: FileChangeInfo[]) => void;
  onWorktreeAccept?: (taskId: string) => void;
  onWorktreeReject?: (taskId: string) => void;
  onOpenFile?: (filePath: string) => void;
  isStreaming?: boolean;
  disabled?: boolean;
  orchestratorState?: string;
  stepProgress?: string;
}

const STATE_LABELS: Record<string, string> = {
  idle: "Ready",
  planning: "Planning…",
  executing: "Executing…",
  verifying: "Verifying…",
  complete: "Done",
  error: "Error",
};

const STATE_COLORS: Record<string, string> = {
  idle: "bg-muted-foreground",
  planning: "bg-primary",
  executing: "bg-primary",
  verifying: "bg-kado-info",
  complete: "bg-primary",
  error: "bg-destructive",
};

export function ChatPanel({
  messages,
  onSendMessage,
  onClear,
  onStop,
  onClarifyingAnswer,
  onAcceptAllChanges,
  onRejectAllChanges,
  onViewFullDiff,
  onWorktreeAccept,
  onWorktreeReject,
  onOpenFile,
  isStreaming = false,
  disabled = false,
  orchestratorState,
  stepProgress,
}: ChatPanelProps) {
  const displayState = orchestratorState ?? "idle";
  const showStatus = displayState !== "idle" && displayState !== "complete";

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-card-line bg-card">
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageCircle className="w-4 h-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-foreground shrink-0">Chat</h2>
          {showStatus && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground-2 min-w-0">
              <span
                className={clsx(
                  "w-2 h-2 rounded-full animate-pulse shrink-0",
                  STATE_COLORS[displayState] ?? "bg-muted-foreground"
                )}
              />
              <span className="truncate">
                {stepProgress ?? STATE_LABELS[displayState] ?? displayState}
              </span>
            </span>
          )}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors duration-150"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </header>
      <MessageList
        messages={messages}
        onClarifyingAnswer={onClarifyingAnswer}
        onAcceptAllChanges={onAcceptAllChanges}
        onRejectAllChanges={onRejectAllChanges}
        onViewFullDiff={onViewFullDiff}
        onWorktreeAccept={onWorktreeAccept}
        onWorktreeReject={onWorktreeReject}
        onOpenFile={onOpenFile}
      />
      <ChatInput
        onSendMessage={onSendMessage}
        onStop={onStop}
        disabled={disabled}
        isStreaming={isStreaming}
      />
    </div>
  );
}
