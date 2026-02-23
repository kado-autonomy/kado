import { ConsoleEntry } from "./types";
import clsx from "clsx";

interface ConsoleOutputProps {
  entry: ConsoleEntry;
}

const ANSI_CODES: Record<string, string> = {
  "0": "reset",
  "1": "bold",
  "31": "red",
  "32": "green",
  "33": "yellow",
  "34": "blue",
  "36": "cyan",
  "37": "white",
  "90": "gray",
};

function parseAnsi(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\x1b\[([0-9;]+)m/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let currentBold = false;
  let currentColor: string | null = null;

  const colorClasses: Record<string, string> = {
    red: "text-red-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    cyan: "text-cyan-400",
    white: "text-white",
    gray: "text-gray-400",
  };

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      const chunk = text.slice(lastIndex, m.index);
      parts.push(
        <span
          key={parts.length}
          className={clsx(
            currentBold && "font-bold",
            currentColor && colorClasses[currentColor]
          )}
        >
          {chunk}
        </span>
      );
    }
    const codes = (m[1] ?? "").split(";");
    for (const c of codes) {
      const name = ANSI_CODES[c];
      if (name === "reset") {
        currentBold = false;
        currentColor = null;
      } else if (name === "bold") {
        currentBold = true;
      } else if (name && colorClasses[name]) {
        currentColor = name;
      }
    }
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span
        key={parts.length}
        className={clsx(
          currentBold && "font-bold",
          currentColor && colorClasses[currentColor]
        )}
      >
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [text];
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

const TYPE_STYLES: Record<
  ConsoleEntry["type"],
  { prefix?: string; className: string }
> = {
  command: {
    prefix: "$",
    className: "font-semibold text-foreground",
  },
  stdout: {
    className: "text-foreground",
  },
  stderr: {
    className: "text-red-400",
  },
  "test-result": {
    className: "text-green-400",
  },
  "lint-result": {
    className: "text-yellow-400",
  },
  info: {
    className: "text-blue-400",
  },
};

export function ConsoleOutput({ entry }: ConsoleOutputProps) {
  const style = TYPE_STYLES[entry.type];
  const hasAnsi = /\x1b\[[0-9;]+m/.test(entry.content);
  const content = hasAnsi ? parseAnsi(entry.content) : entry.content;

  return (
    <div
      className={clsx(
        "group flex items-start gap-2 py-0.5 font-mono text-sm",
        style.className
      )}
      title={formatTimestamp(entry.timestamp)}
    >
      {style.prefix && (
        <span className="flex-shrink-0 text-muted-foreground">{style.prefix}</span>
      )}
      <span className="flex-1 min-w-0 break-words">{content}</span>
      {entry.type === "command" && entry.exitCode !== undefined && (
        <span
          className={clsx(
            "flex-shrink-0 px-1.5 py-0.5 rounded text-xs",
            entry.exitCode === 0
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          )}
        >
          {entry.exitCode}
        </span>
      )}
    </div>
  );
}
