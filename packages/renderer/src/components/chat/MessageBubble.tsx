import { MarkdownRenderer } from "./MarkdownRenderer";
import { ChangeSummaryCard } from "./ChangeSummaryCard";
import { WorktreeDiffCard } from "./WorktreeDiffCard";
import { Wrench, ListChecks, Loader2, CheckCircle2, XCircle } from "lucide-react";
import clsx from "clsx";
import type { ChatMessage, FileChangeInfo } from "@/hooks/useChatHistory";

interface MessageBubbleProps {
  message: ChatMessage;
  onAcceptAllChanges?: (changes?: FileChangeInfo[]) => void;
  onRejectAllChanges?: (changes?: FileChangeInfo[]) => void;
  onViewFullDiff?: (changes?: FileChangeInfo[]) => void;
  onWorktreeAccept?: (taskId: string) => void;
  onWorktreeReject?: (taskId: string) => void;
  onOpenFile?: (filePath: string) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
    </span>
  );
}

const TOOL_LABELS: Record<string, string> = {
  file_read: "Reading file",
  file_write: "Writing file",
  file_edit: "Editing file",
  glob_search: "Searching files",
  grep_search: "Searching code",
  shell_execute: "Running command",
  test_runner: "Running tests",
  lint: "Running linter",
  semantic_search: "Semantic search",
  web_search: "Web search",
};

function ToolCallCard({
  toolName,
  args,
  completed,
  success,
  onOpenFile,
}: {
  toolName: string;
  args?: Record<string, unknown>;
  completed?: boolean;
  success?: boolean;
  onOpenFile?: (filePath: string) => void;
}) {
  const label = TOOL_LABELS[toolName] ?? toolName;
  const filePath = args?.['path'] ?? args?.['file'] ?? args?.['pattern'] ?? args?.['command'];
  const detail = typeof filePath === 'string' ? filePath : undefined;

  const StatusIcon = completed
    ? success
      ? CheckCircle2
      : XCircle
    : Loader2;

  const iconClass = completed
    ? success
      ? "w-3.5 h-3.5 text-kado-success shrink-0"
      : "w-3.5 h-3.5 text-destructive shrink-0"
    : "w-3 h-3 text-primary animate-spin shrink-0";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/60 border border-line-2 min-w-0">
      <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-foreground shrink-0">{label}</span>
          {detail && (
            <span
              title={detail}
              className={clsx(
                "text-xs text-muted-foreground font-mono truncate min-w-0",
                onOpenFile && "cursor-pointer hover:text-primary hover:underline",
              )}
              onClick={onOpenFile && detail ? () => onOpenFile(detail) : undefined}
            >
              {detail}
            </span>
          )}
        </div>
      </div>
      <StatusIcon className={iconClass} />
    </div>
  );
}

function PlanCard({ title, steps }: { title: string; steps: Array<{ id: string; toolName: string; description: string }> }) {
  return (
    <div className="rounded-lg bg-surface/60 border border-line-2 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-line-2 bg-card min-w-0">
        <ListChecks className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground truncate min-w-0">{title}</span>
        <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">{steps.length} steps</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-2 text-xs min-w-0">
            <span className="text-muted-foreground font-mono w-4 text-right shrink-0">{i + 1}.</span>
            <span className="text-foreground min-w-0 break-words flex-1">{step.description}</span>
            <span className="text-primary/60 font-mono text-[10px] shrink-0">{step.toolName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  onAcceptAllChanges,
  onRejectAllChanges,
  onViewFullDiff,
  onWorktreeAccept,
  onWorktreeReject,
  onOpenFile,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";
  const isChangeSummary = message.type === "change-summary";
  const isToolCall = message.type === "tool-call";
  const isPlanCreated = message.type === "plan-created";
  const isWorktreeDiff = message.type === "worktree-diff";

  if (isToolCall && message.meta?.toolName) {
    return (
      <div className="flex justify-start my-1.5" title={formatTimestamp(message.timestamp)}>
        <div className="w-full">
          <ToolCallCard
            toolName={message.meta.toolName}
            args={message.meta.args}
            completed={message.meta.completed as boolean | undefined}
            success={message.meta.success as boolean | undefined}
            onOpenFile={onOpenFile}
          />
        </div>
      </div>
    );
  }

  if (isWorktreeDiff && message.meta?.worktreeDiff) {
    const diff = message.meta.worktreeDiff as {
      taskId: string;
      branch: string;
      files: Array<{ path: string; status: string; original: string; modified: string; additions: number; deletions: number }>;
      accepted?: boolean;
      rejected?: boolean;
    };
    return (
      <div className="flex justify-start my-2" title={formatTimestamp(message.timestamp)}>
        <div className="w-full">
          <WorktreeDiffCard
            taskId={diff.taskId}
            branch={diff.branch}
            files={diff.files}
            accepted={diff.accepted}
            rejected={diff.rejected}
            onAccept={onWorktreeAccept ? () => onWorktreeAccept(diff.taskId) : undefined}
            onReject={onWorktreeReject ? () => onWorktreeReject(diff.taskId) : undefined}
            onOpenFile={onOpenFile}
          />
        </div>
      </div>
    );
  }

  if (isPlanCreated && message.meta?.steps) {
    return (
      <div className="flex justify-start my-2" title={formatTimestamp(message.timestamp)}>
        <div className="w-full">
          <PlanCard title={message.meta.title ?? 'Plan'} steps={message.meta.steps} />
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div
        className="flex justify-center my-2"
        title={formatTimestamp(message.timestamp)}
      >
        <div className="px-4 py-2 rounded-lg bg-muted text-muted-foreground-1 text-xs max-w-[80%] text-center">
          <MarkdownRenderer content={message.content} />
        </div>
      </div>
    );
  }

  if (isChangeSummary && message.meta?.fileChanges) {
    const changes = message.meta.fileChanges;
    return (
      <div
        className="flex justify-start my-2"
        title={formatTimestamp(message.timestamp)}
      >
        <div className="w-full">
          <ChangeSummaryCard
            changes={changes}
            onAcceptAll={onAcceptAllChanges ? () => onAcceptAllChanges(changes) : undefined}
            onRejectAll={onRejectAllChanges ? () => onRejectAllChanges(changes) : undefined}
            onViewFullDiff={onViewFullDiff ? () => onViewFullDiff(changes) : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex my-2 min-w-0",
        isUser && "justify-end",
        isAssistant && "justify-start"
      )}
      title={formatTimestamp(message.timestamp)}
    >
      <div
        className={clsx(
          "group relative w-full max-w-[85%] min-w-[min(60%,320px)] px-4 py-2.5 rounded-xl overflow-hidden",
          isUser &&
            "bg-primary text-primary-foreground rounded-br-sm shadow-sm shadow-primary/20",
          isAssistant &&
            "bg-surface/50 text-foreground rounded-bl-sm border border-line-2"
        )}
      >
        {isAssistant ? (
          <div className="text-sm prose prose-invert max-w-none break-words">
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && <StreamingDots />}
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            {message.isStreaming && <StreamingDots />}
          </p>
        )}
      </div>
    </div>
  );
}
