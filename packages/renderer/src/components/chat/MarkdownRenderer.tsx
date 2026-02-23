import { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import clsx from "clsx";

interface Block {
  type: "codeBlock" | "header" | "listItem" | "paragraph";
  content: string;
  language?: string;
  level?: number;
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const codeBlockMatch = line.match(/^```(\w*)\s*$/);
    if (codeBlockMatch) {
      const lang = codeBlockMatch[1] ?? "";
      const blockLines: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (next?.startsWith("```")) break;
        blockLines.push(next ?? "");
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "codeBlock", content: blockLines.join("\n"), language: lang });
      continue;
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      blocks.push({
        type: "header",
        content: headerMatch[2] ?? "",
        level: (headerMatch[1] ?? "").length,
      });
      i++;
      continue;
    }

    const listMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (listMatch) {
      blocks.push({ type: "listItem", content: listMatch[1] ?? "" });
      i++;
      continue;
    }

    if (line.trim()) {
      blocks.push({ type: "paragraph", content: line });
    }
    i++;
  }

  return blocks;
}

type InlinePart = { type: "text" | "bold" | "italic" | "code" | "link"; content: string; href?: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, m.index) });
    }
    if (m[2] !== undefined) {
      parts.push({ type: "bold", content: m[2] });
    } else if (m[3] !== undefined) {
      parts.push({ type: "italic", content: m[3] });
    } else if (m[4] !== undefined) {
      parts.push({ type: "code", content: m[4] });
    } else if (m[5] !== undefined && m[6] !== undefined) {
      parts.push({ type: "link", content: m[5], href: m[6] });
    }
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

function renderInline(parts: InlinePart[]): React.ReactNode[] {
  return parts.map((part, idx) => {
    switch (part.type) {
      case "bold":
        return <strong key={idx} className="font-semibold">{part.content}</strong>;
      case "italic":
        return <em key={idx} className="italic">{part.content}</em>;
      case "code":
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-surface text-primary font-mono text-sm break-all"
          >
            {part.content}
          </code>
        );
      case "link":
        return (
          <a
            key={idx}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {part.content}
          </a>
        );
      default:
        return <span key={idx}>{part.content}</span>;
    }
  });
}

function CodeBlock({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-line-2 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-line-2">
        {language && (
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-card text-sm text-foreground font-mono min-w-0">
        <code className="whitespace-pre">{content}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  const elements: React.ReactNode[] = [];
  let listBuffer: Block[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={elements.length} className="ml-4 list-disc mb-2 space-y-0.5">
          {listBuffer.map((b, i) => (
            <li key={i}>{renderInline(parseInline(b.content))}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  blocks.forEach((block, idx) => {
    if (block.type === "codeBlock") {
      flushList();
      elements.push(
        <CodeBlock
          key={idx}
          content={block.content}
          language={block.language}
        />
      );
    } else if (block.type === "header") {
      flushList();
      const Tag = `h${block.level ?? 3}` as keyof JSX.IntrinsicElements;
      elements.push(
        <Tag
          key={idx}
          className={clsx(
            "font-semibold text-foreground",
            block.level === 1 && "text-lg mt-2",
            block.level === 2 && "text-base mt-2",
            block.level === 3 && "text-sm mt-1"
          )}
        >
          {renderInline(parseInline(block.content))}
        </Tag>
      );
    } else if (block.type === "listItem") {
      listBuffer.push(block);
    } else {
      flushList();
      elements.push(
        <p key={idx} className="mb-1 last:mb-0">
          {renderInline(parseInline(block.content))}
        </p>
      );
    }
  });
  flushList();

  return <div className="markdown-content space-y-1 min-w-0 overflow-hidden break-words">{elements}</div>;
}
