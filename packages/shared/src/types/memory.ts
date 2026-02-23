export type MemoryType =
  | 'conversation'
  | 'code'
  | 'knowledge'
  | 'instruction';

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    timestamp: number;
    type: MemoryType;
  };
  relevanceScore?: number;
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  summary: string;
  messageRange: {
    start: number;
    end: number;
  };
  createdAt: number;
}

export type CodeSymbolType =
  | 'function'
  | 'class'
  | 'method'
  | 'variable'
  | 'import'
  | 'export'
  | 'other';

export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  symbolName?: string;
  symbolType: CodeSymbolType;
  embedding?: number[];
}
