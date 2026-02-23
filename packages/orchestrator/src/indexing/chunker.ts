import { detectLanguage } from './language-detector.js';
import { ASTParser } from './ast-parser.js';

export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  symbolName?: string;
  symbolType?: string;
}

const MAX_CHUNK_CHARS = 2000;
const CONTEXT_LINES = 2;

let sharedASTParser: ASTParser | null = null;
let astParserInitPromise: Promise<boolean> | null = null;

export async function initASTParser(wasmDir?: string): Promise<boolean> {
  if (sharedASTParser?.initialized) return true;
  sharedASTParser = new ASTParser(wasmDir);
  astParserInitPromise = sharedASTParser.init();
  return astParserInitPromise;
}

export function getASTParser(): ASTParser | null {
  return sharedASTParser?.initialized ? sharedASTParser : null;
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function extractContext(
  lines: string[],
  start: number,
  end: number
): { content: string; startLine: number; endLine: number } {
  const before = Math.max(0, start - CONTEXT_LINES);
  const after = Math.min(lines.length - 1, end + CONTEXT_LINES);
  const slice = lines.slice(before, after + 1);
  return {
    content: slice.join('\n'),
    startLine: before + 1,
    endLine: after + 1,
  };
}

const JS_TS_PATTERNS = [
  {
    regex: /^(export\s+)?(async\s+)?function\s+(\w+)\s*\(/gm,
    type: 'function',
  },
  {
    regex: /^(export\s+)?(async\s+)?(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function)/gm,
    type: 'function',
  },
  {
    regex: /^(export\s+)?class\s+(\w+)(?:\s+extends\s+[\w.]+)?\s*\{/gm,
    type: 'class',
  },
  {
    regex: /^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>[\],\s|&]+)?\s*\{/gm,
    type: 'method',
  },
  {
    regex: /^export\s+(?:const|let|var)\s+(\w+)/gm,
    type: 'export',
  },
  {
    regex: /^export\s+default\s+(?:function\s+)?(\w+)?/gm,
    type: 'export',
  },
  {
    regex: /^import\s+.*\s+from\s+['"]/gm,
    type: 'import',
  },
  {
    regex: /^import\s+['"]/gm,
    type: 'import',
  },
];

const PYTHON_PATTERNS = [
  { regex: /^def\s+(\w+)\s*\(/gm, type: 'function' },
  { regex: /^async\s+def\s+(\w+)\s*\(/gm, type: 'function' },
  { regex: /^class\s+(\w+)(?:\s*\([^)]*\))?\s*:/gm, type: 'class' },
  { regex: /^\s+def\s+(\w+)\s*\(/gm, type: 'method' },
  { regex: /^\s+async\s+def\s+(\w+)\s*\(/gm, type: 'method' },
];

function findBlockEnd(
  lines: string[],
  startIdx: number,
  indentLevel: number,
  language: string
): number {
  if (language === 'python') {
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      const indent = line.search(/\S/);
      if (indent >= 0 && indent <= indentLevel) return i - 1;
    }
    return lines.length - 1;
  }
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const c of line) {
      if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    if (depth <= 0) return i;
  }
  return lines.length - 1;
}

function parseJsTs(content: string): Array<{ start: number; end: number; name?: string; type?: string }> {
  const lines = content.split('\n');
  const blocks: Array<{ start: number; end: number; name?: string; type?: string }> = [];
  for (const { regex, type } of JS_TS_PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      const line = lines[lineNum - 1] ?? '';
      const indent = line.search(/\S/);
      const endLine = findBlockEnd(lines, lineNum - 1, indent, 'typescript');
      const name = m[3] ?? m[2] ?? m[1];
      blocks.push({
        start: lineNum,
        end: endLine + 1,
        name: typeof name === 'string' ? name : undefined,
        type,
      });
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

function parsePython(content: string): Array<{ start: number; end: number; name?: string; type?: string }> {
  const lines = content.split('\n');
  const blocks: Array<{ start: number; end: number; name?: string; type?: string }> = [];
  for (const { regex, type } of PYTHON_PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      const line = lines[lineNum - 1] ?? '';
      const indent = line.search(/\S/);
      const endLine = findBlockEnd(lines, lineNum - 1, indent, 'python');
      const name = m[1];
      blocks.push({
        start: lineNum,
        end: endLine + 1,
        name: typeof name === 'string' ? name : undefined,
        type,
      });
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}

function parseGeneric(content: string): Array<{ start: number; end: number }> {
  const lines = content.split('\n');
  const blocks: Array<{ start: number; end: number }> = [];
  let blockStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (trimmed === '' && blockStart < i) {
      blocks.push({ start: blockStart + 1, end: i });
      blockStart = i + 1;
    }
  }
  if (blockStart < lines.length) {
    blocks.push({ start: blockStart + 1, end: lines.length });
  }
  return blocks;
}

export function chunkFile(filePath: string, content: string): CodeChunk[] {
  const astParser = getASTParser();
  const language = detectLanguage(filePath);

  if (astParser && astParser.supportsLanguage(language)) {
    const astChunks = astParser.extractChunks(content, filePath);
    if (astChunks.length > 0) return astChunks;
  }

  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];
  const seen = new Set<string>();

  let blocks: Array<{ start: number; end: number; name?: string; type?: string }>;

  if (language === 'typescript' || language === 'javascript') {
    blocks = parseJsTs(content);
  } else if (language === 'python') {
    blocks = parsePython(content);
  } else {
    blocks = parseGeneric(content).map((b) => ({ ...b, name: undefined, type: undefined }));
  }

  for (const block of blocks) {
    const { content: chunkContent, startLine, endLine } = extractContext(
      lines,
      block.start - 1,
      block.end - 1
    );
    if (chunkContent.length > MAX_CHUNK_CHARS) {
      const subLines = chunkContent.split('\n');
      let offset = 0;
      while (offset < subLines.length) {
        const slice = subLines.slice(offset, offset + 40);
        const subContent = slice.join('\n');
        const subStart = startLine + offset;
        const subEnd = startLine + offset + slice.length - 1;
        const chunkId = `${filePath}:${subStart}:${hash(subContent)}`;
        if (!seen.has(chunkId)) {
          seen.add(chunkId);
          chunks.push({
            id: chunkId,
            filePath,
            startLine: subStart,
            endLine: subEnd,
            content: subContent,
            language,
            symbolName: block.name,
            symbolType: block.type,
          });
        }
        offset += 35;
      }
    } else {
      const chunkId = `${filePath}:${startLine}:${hash(chunkContent)}`;
      if (!seen.has(chunkId)) {
        seen.add(chunkId);
        chunks.push({
          id: chunkId,
          filePath,
          startLine,
          endLine,
          content: chunkContent,
          language,
          symbolName: block.name,
          symbolType: block.type,
        });
      }
    }
  }

  return chunks;
}
