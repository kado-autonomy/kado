import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GrepSearchTool } from '../grep-search.js';

interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

describe('GrepSearchTool', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'grep-search-test-'));
    projectPath = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  function scaffold(files: Record<string, string>): void {
    for (const [name, content] of Object.entries(files)) {
      const full = join(tmpDir, name);
      const dir = full.substring(0, full.lastIndexOf('/'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(full, content);
    }
  }

  it('finds basic regex matches', async () => {
    scaffold({
      'hello.ts': 'const greeting = "hello";\nconst farewell = "goodbye";',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'hello' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    expect(matches.length).toBe(1);
    expect(matches[0]!.file).toBe('hello.ts');
    expect(matches[0]!.line).toBe(1);
  });

  it('finds matches across multiple files', async () => {
    scaffold({
      'a.ts': 'export const FOO = 1;',
      'b.ts': 'import { FOO } from "./a";',
      'c.ts': 'const bar = 2;',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'FOO' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    const matchedFiles = matches.map((m) => m.file).sort();
    expect(matchedFiles).toEqual(['a.ts', 'b.ts']);
  });

  it('does not miss matches due to stateful regex (g flag regression)', async () => {
    scaffold({
      'one.ts': 'MATCH line one',
      'two.ts': 'MATCH line two',
      'three.ts': 'MATCH line three',
      'four.ts': 'MATCH line four',
      'five.ts': 'MATCH line five',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'MATCH' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    expect(matches.length).toBe(5);
  });

  it('filters files by fileGlob', async () => {
    scaffold({
      'src/app.ts': 'console.log("ts file");',
      'src/app.js': 'console.log("js file");',
      'src/style.css': '.log { color: red; }',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'log', fileGlob: '**/*.ts' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    expect(matches.length).toBe(1);
    expect(matches[0]!.file).toBe('src/app.ts');
  });

  it('handles ** in fileGlob correctly', async () => {
    scaffold({
      'src/components/Hero.tsx': '<h1>Hero</h1>',
      'lib/utils.ts': 'export function hero() {}',
      'readme.md': '# Hero section',
    });
    const result = await GrepSearchTool.execute(
      { pattern: '[Hh]ero', fileGlob: '**/*.{ts,tsx}' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    const matchedFiles = matches.map((m) => m.file).sort();
    expect(matchedFiles).toEqual(['lib/utils.ts', 'src/components/Hero.tsx']);
  });

  it('fileGlob matches against relative path, not just filename', async () => {
    scaffold({
      'src/components/Button.tsx': 'export function Button() {}',
      'docs/Button.tsx': 'docs Button',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'Button', fileGlob: 'src/**/*.tsx' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    expect(matches.length).toBe(1);
    expect(matches[0]!.file).toBe('src/components/Button.tsx');
  });

  it('excludes node_modules and .git', async () => {
    scaffold({
      'src/index.ts': 'findme',
      'node_modules/pkg/index.ts': 'findme',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'findme' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    expect(matches.length).toBe(1);
    expect(matches[0]!.file).toBe('src/index.ts');
  });

  it('returns empty array when no matches', async () => {
    scaffold({
      'a.ts': 'nothing here',
    });
    const result = await GrepSearchTool.execute(
      { pattern: 'zzzzz_not_found' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('handles complex regex patterns', async () => {
    scaffold({
      'component.tsx': '<HeroSection className="main" />\n<Footer />',
    });
    const result = await GrepSearchTool.execute(
      { pattern: '<Hero\\w+' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const matches = result.data as GrepMatch[];
    expect(matches.length).toBe(1);
    expect(matches[0]!.content).toContain('<HeroSection');
  });
});
