import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ClarifyingQuestion } from "./ClarifyingQuestion";
import type { ChatMessage, FileChangeInfo } from "@/hooks/useChatHistory";

interface MessageListProps {
  messages: ChatMessage[];
  onClarifyingAnswer?: (answer: string) => void;
  onAcceptAllChanges?: (changes?: FileChangeInfo[]) => void;
  onRejectAllChanges?: (changes?: FileChangeInfo[]) => void;
  onViewFullDiff?: (changes?: FileChangeInfo[]) => void;
  onWorktreeAccept?: (taskId: string) => void;
  onWorktreeReject?: (taskId: string) => void;
  onOpenFile?: (filePath: string) => void;
}

export function MessageList({
  messages,
  onClarifyingAnswer,
  onAcceptAllChanges,
  onRejectAllChanges,
  onViewFullDiff,
  onWorktreeAccept,
  onWorktreeReject,
  onOpenFile,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-lg">💬</span>
        </div>
        <p className="text-muted-foreground-2 text-sm font-medium">Start a conversation with Kado</p>
        <p className="text-muted-foreground text-xs">Describe what you want to build or ask a question</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 scroll-smooth"
    >
      <div className="space-y-0 w-full max-w-[min(100%,640px)] mx-auto">
        {messages.map((msg) => {
          if (msg.type === "clarifying-question") {
            return (
              <ClarifyingQuestion
                key={msg.id}
                question={msg.content}
                options={msg.meta?.options}
                allowFreeText={msg.meta?.allowFreeText ?? true}
                onAnswer={(answer) => onClarifyingAnswer?.(answer)}
              />
            );
          }
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              onAcceptAllChanges={onAcceptAllChanges}
              onRejectAllChanges={onRejectAllChanges}
              onViewFullDiff={onViewFullDiff}
              onWorktreeAccept={onWorktreeAccept}
              onWorktreeReject={onWorktreeReject}
              onOpenFile={onOpenFile}
            />
          );
        })}
      </div>
    </div>
  );
}
