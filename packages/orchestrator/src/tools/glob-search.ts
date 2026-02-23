import { readdir } from 'fs/promises';
import { resolve } from 'path';
import type { Dirent } from 'fs';
import type { Tool, ToolResult } from './types.js';

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

function globToRegex(pattern: string): RegExp {
  const expanded = expandBraces(pattern);
  if (expanded.length === 1) {
    return new RegExp(`^${singleGlobToRegex(expanded[0]!)}$`);
  }
  const alt = expanded.map((p) => singleGlobToRegex(p)).join('|');
  return new RegExp(`^(?:${alt})$`);
}

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit',
  'dist', 'build', '.cache', '.turbo', '.output', '__pycache__',
  'coverage', '.vercel', '.netlify',
]);

async function globMatch(
  rootBase: string,
  relDir: string,
  regex: RegExp,
  results: string[]
): Promise<void> {
  const fullDir = relDir ? resolve(rootBase, relDir) : resolve(rootBase);
  let entries: Dirent[];
  try {
    entries = await readdir(fullDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const childRel = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.has(e.name)) continue;
      await globMatch(rootBase, childRel, regex, results);
    }
    if (e.isFile()) {
      if (regex.test(childRel)) {
        results.push(childRel);
      }
    }
  }
}

export const GlobSearchTool: Tool = {
  definition: {
    name: 'glob_search',
    description: 'Find files matching a glob pattern',
    category: 'search',
    parameters: [
      { name: 'pattern', type: 'string', description: 'Glob pattern (e.g. **/*.ts)', required: true },
      { name: 'cwd', type: 'string', description: 'Base directory', required: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const pattern = args.pattern as string;
      const cwd = (args.cwd as string) ?? ctx.projectPath;
      const base = resolve(ctx.projectPath, cwd);
      const regex = globToRegex(pattern);
      const results: string[] = [];
      await globMatch(base, '', regex, results);
      return { success: true, data: results, duration: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
