import { useEffect } from "react";
import Editor from "@monaco-editor/react";

interface MonacoWrapperProps {
  content: string;
  language: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export function MonacoWrapper({
  content,
  language,
  onChange,
  onSave,
  readOnly = false,
}: MonacoWrapperProps) {
  useEffect(() => {
    if (!onSave) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  return (
    <Editor
      height="100%"
      defaultLanguage={language}
      language={language}
      value={content}
      onChange={(value) => onChange?.(value ?? "")}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: true },
        lineNumbers: "on",
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: "always",
        autoIndent: "full",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
      }}
    />
  );
}
