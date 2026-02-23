import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { Tool, ToolResult } from './types.js';

interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

async function walkDir(
  base: string,
  relPath: string,
  fileGlob: RegExp | null,
  excludeDirs: Set<string>
): Promise<string[]> {
  const fullPath = join(base, relPath);
  const entries = await readdir(fullPath, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const childRel = relPath ? `${relPath}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!excludeDirs.has(e.name)) {
        files.push(...(await walkDir(base, childRel, fileGlob, excludeDirs)));
      }
    } else if (e.isFile()) {
      if (!fileGlob || fileGlob.test(childRel)) {
        files.push(childRel);
      }
    }
  }
  return files;
}

function expandBraces(pattern: string): string[] {
  const match = pattern.match(/^(.*?)\{([^}]+)\}(.*)$/);
  if (!match) return [pattern];
  const [, prefix, alternatives, suffix] = match;
  const alts = alternatives!.split(',');
  const expanded: string[] = [];
  for (const alt of alts) {
    expanded.push(...expandBraces(`${prefix}${alt}${suffix}`));
  }
  return expanded;
}

function singleGlobToRegex(pattern: string): string {
  let result = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        result += '(?:.*/)?';
        i += 3;
      } else if (i > 0 && pattern[i - 1] === '/') {
        result += '.*';
        i += 2;
      } else {
        result += '.*';
        i += 2;
      }
    } else if (pattern[i] === '*') {
      result += '[^/]*';
      i += 1;
    } else if (pattern[i] === '?') {
      result += '[^/]';
      i += 1;
    } else {
      result += pattern[i]!.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return result;
}

function globToRegex(glob: string): RegExp {
  const expanded = expandBraces(glob);
  if (expanded.length === 1) {
    return new RegExp(`^${singleGlobToRegex(expanded[0]!)}$`);
  }
  const alt = expanded.map((p) => singleGlobToRegex(p)).join('|');
  return new RegExp(`^(?:${alt})$`);
}

export const GrepSearchTool: Tool = {
  definition: {
    name: 'grep_search',
    description: 'Search file contents by regex',
    category: 'search',
    parameters: [
      { name: 'pattern', type: 'string', description: 'Regex pattern', required: true },
      { name: 'path', type: 'string', description: 'Directory to search', required: false },
      { name: 'fileGlob', type: 'string', description: 'File glob (e.g. *.ts)', required: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const pattern = args.pattern as string;
      const pathArg = args.path as string | undefined;
      const fileGlobStr = args.fileGlob as string | undefined;
      const base = resolve(ctx.projectPath, pathArg ?? '.');
      const fileGlob = fileGlobStr ? globToRegex(fileGlobStr) : null;
      const excludeDirs = new Set(['node_modules', '.git', 'dist', 'build']);
      const files = await walkDir(base, '', fileGlob, excludeDirs);
      const regex = new RegExp(pattern);
      const matches: GrepMatch[] = [];
      for (const f of files) {
        const fullPath = join(base, f);
        let content: string;
        try {
          content = await readFile(fullPath, 'utf-8');
        } catch {
          continue;
        }
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line !== undefined && regex.test(line)) {
            matches.push({ file: f, line: i + 1, content: line });
          }
        }
      }
      return { success: true, data: matches, duration: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
