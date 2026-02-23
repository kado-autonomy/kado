import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import type { VectorBridge } from '../memory/vector-bridge.js';
import { chunkFile, type CodeChunk } from './chunker.js';

export interface IndexStats {
  filesIndexed: number;
  chunksCreated: number;
  duration: number;
}

export interface CodeLocation {
  filePath: string;
  line: number;
  column: number;
  symbolType: string;
}

export interface CodeChunkResult {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
  symbolName?: string;
  symbolType?: string;
}

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
  '.next',
  '.nuxt',
]);

const INDEXABLE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw', '.pyi', '.rs', '.go', '.java',
  '.kt', '.kts', '.c', '.h', '.cpp', '.cc', '.cxx',
  '.hpp', '.hxx', '.rb', '.php', '.swift', '.vue',
  '.svelte', '.md', '.mdx',
]);

export class CodeIndexer {
  private fileToChunks = new Map<string, Set<string>>();

  constructor(
    private projectPath: string,
    private vectorBridge: VectorBridge
  ) {}

  private async collectFiles(dir: string, base: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) {
          files.push(...(await this.collectFiles(join(dir, e.name), base)));
        }
      } else if (e.isFile()) {
        const relPath = relative(base, join(dir, e.name));
        const ext = '.' + (relPath.split('.').pop() ?? '');
        if (INDEXABLE_EXT.has(ext)) {
          files.push(relPath);
        }
      }
    }
    return files;
  }

  private isIndexable(relPath: string): boolean {
    const ext = '.' + (relPath.split('.').pop() ?? '');
    return INDEXABLE_EXT.has(ext);
  }

  async indexProject(): Promise<IndexStats> {
    const start = Date.now();
    const files = await this.collectFiles(this.projectPath, this.projectPath);
    let chunksCreated = 0;
    for (const f of files) {
      const fullPath = join(this.projectPath, f);
      await this.indexFile(fullPath);
      chunksCreated += (await this.getChunksForFile(fullPath)).length;
    }
    return {
      filesIndexed: files.length,
      chunksCreated,
      duration: Date.now() - start,
    };
  }

  private async getChunksForFile(filePath: string): Promise<CodeChunk[]> {
    const content = await readFile(filePath, 'utf-8');
    const rel = relative(this.projectPath, filePath);
    return chunkFile(rel, content);
  }

  async indexFile(filePath: string): Promise<void> {
    const rel = relative(this.projectPath, filePath);
    if (!this.isIndexable(rel)) return;
    const content = await readFile(filePath, 'utf-8');
    const chunks = chunkFile(rel, content);
    const ids = new Set<string>();
    for (const c of chunks) {
      ids.add(c.id);
      await this.vectorBridge.upsert(c.id, c.content, {
        filePath: rel,
        startLine: c.startLine,
        endLine: c.endLine,
        text: c.content,
        language: c.language,
        symbolName: c.symbolName,
        symbolType: c.symbolType,
      });
    }
    this.fileToChunks.set(rel, ids);
  }

  async reindexChanged(changedFiles: string[]): Promise<void> {
    for (const f of changedFiles) {
      const rel = relative(this.projectPath, f);
      if (!this.isIndexable(rel)) continue;
      const content = await readFile(f, 'utf-8');
      const chunks = chunkFile(rel, content);
      const ids = new Set(chunks.map((c) => c.id));
      const results = await this.vectorBridge.query(rel, 500);
      for (const r of results) {
        if (r.metadata?.filePath === rel && !ids.has(r.id)) {
          await this.vectorBridge.delete(r.id);
        }
      }
      for (const c of chunks) {
        await this.vectorBridge.upsert(c.id, c.content, {
          filePath: rel,
          startLine: c.startLine,
          endLine: c.endLine,
          text: c.content,
          language: c.language,
          symbolName: c.symbolName,
          symbolType: c.symbolType,
        });
      }
    }
  }

  async findDefinition(symbolName: string): Promise<CodeLocation[]> {
    const results = await this.vectorBridge.query(symbolName, 20);
    const locations: CodeLocation[] = [];
    for (const r of results) {
      const meta = r.metadata as Record<string, unknown>;
      const sn = meta?.symbolName as string | undefined;
      const st = meta?.symbolType as string | undefined;
      if (sn?.toLowerCase() === symbolName.toLowerCase() && (st === 'function' || st === 'class' || st === 'method')) {
        locations.push({
          filePath: (meta.filePath as string) ?? '',
          line: (meta.startLine as number) ?? 0,
          column: 0,
          symbolType: st ?? 'unknown',
        });
      }
    }
    return locations;
  }

  async findReferences(symbolName: string): Promise<CodeLocation[]> {
    const results = await this.vectorBridge.query(symbolName, 30);
    const locations: CodeLocation[] = [];
    for (const r of results) {
      const meta = r.metadata as Record<string, unknown>;
      const content = (meta.text as string) ?? r.text ?? '';
      if (content.includes(symbolName)) {
        const match = content.indexOf(symbolName);
        const before = content.slice(0, match);
        const line = before.split('\n').length;
        const col = before.split('\n').pop()?.length ?? 0;
        locations.push({
          filePath: (meta.filePath as string) ?? '',
          line: ((meta.startLine as number) ?? 0) + line - 1,
          column: col,
          symbolType: (meta.symbolType as string) ?? 'reference',
        });
      }
    }
    return locations;
  }

  async semanticSearch(query: string, topK = 10): Promise<CodeChunkResult[]> {
    const results = await this.vectorBridge.query(query, topK);
    return results.map((r) => {
      const meta = r.metadata as Record<string, unknown>;
      return {
        filePath: (meta.filePath as string) ?? '',
        startLine: (meta.startLine as number) ?? 0,
        endLine: (meta.endLine as number) ?? 0,
        content: r.text,
        score: r.score,
        symbolName: meta.symbolName as string | undefined,
        symbolType: meta.symbolType as string | undefined,
      };
    });
  }
}
