export type ConsoleEntryType =
  | "command"
  | "stdout"
  | "stderr"
  | "test-result"
  | "lint-result"
  | "info";

export interface ConsoleEntry {
  id: string;
  type: ConsoleEntryType;
  content: string;
  timestamp: number;
  exitCode?: number;
}
