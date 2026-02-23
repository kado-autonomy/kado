import { useState } from "react";

interface ClarifyingQuestionProps {
  question: string;
  options?: string[];
  allowFreeText?: boolean;
  onAnswer: (answer: string) => void;
}

export function ClarifyingQuestion({
  question,
  options = [],
  allowFreeText = false,
  onAnswer,
}: ClarifyingQuestionProps) {
  const [freeText, setFreeText] = useState("");

  const handleOptionClick = (opt: string) => {
    onAnswer(opt);
  };

  const handleFreeTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = freeText.trim();
    if (trimmed) {
      onAnswer(trimmed);
      setFreeText("");
    }
  };

  return (
    <div className="my-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 shadow-sm min-w-0 overflow-hidden">
      <p className="text-sm font-medium text-foreground mb-3">{question}</p>
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleOptionClick(opt)}
              className="px-3 py-1.5 text-sm rounded-lg bg-layer hover:bg-primary/15 text-foreground hover:text-primary border border-line-2 hover:border-primary/40 transition-colors duration-150"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {allowFreeText && (
        <form onSubmit={handleFreeTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-background border border-line-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={!freeText.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 shadow-sm"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
