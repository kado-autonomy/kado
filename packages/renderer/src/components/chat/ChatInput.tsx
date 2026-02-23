import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

const MAX_HEIGHT = 200;

export function ChatInput({
  onSendMessage,
  onStop,
  disabled = false,
  isStreaming = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSendMessage(value.trim());
        setValue("");
      }
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setValue("");
  };

  const isDisabled = disabled || isStreaming || !value.trim();
  const showStop = isStreaming && onStop;

  return (
    <div className="flex-shrink-0 border-t border-card-line bg-card p-3">
      <div className="flex gap-2 items-end rounded-xl border border-line-2 bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-200 shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a task or ask a question..."
          disabled={disabled}
          rows={1}
          className="flex-1 min-h-[44px] max-h-[200px] resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ overflowY: "auto" }}
        />
        <div className="flex items-center gap-1 p-2">
          {showStop ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSend}
            disabled={isDisabled}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary/10 disabled:hover:text-primary transition-all duration-150"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
