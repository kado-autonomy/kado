import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { GlobSearchTool } from '../glob-search.js';

describe('GlobSearchTool', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'glob-search-test-'));
    projectPath = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  function scaffold(files: string[]): void {
    for (const f of files) {
      const full = join(tmpDir, f);
      const dir = full.substring(0, full.lastIndexOf('/'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(full, '');
    }
  }

  it('finds files with simple extension glob', async () => {
    scaffold(['a.ts', 'b.js', 'c.ts', 'sub/d.ts']);
    const result = await GlobSearchTool.execute(
      { pattern: '**/*.ts' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('a.ts');
    expect(files).toContain('c.ts');
    expect(files).toContain('sub/d.ts');
    expect(files).not.toContain('b.js');
  });

  it('returns relative paths, not absolute', async () => {
    scaffold(['src/index.ts']);
    const result = await GlobSearchTool.execute(
      { pattern: '**/*.ts' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('src/index.ts');
    for (const f of files) {
      expect(f).not.toMatch(/^\//);
    }
  });

  it('handles brace expansion', async () => {
    scaffold(['app.tsx', 'lib.ts', 'data.json']);
    const result = await GlobSearchTool.execute(
      { pattern: '*.{ts,tsx}' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('app.tsx');
    expect(files).toContain('lib.ts');
    expect(files).not.toContain('data.json');
  });

  it('matches ** across multiple directory levels', async () => {
    scaffold([
      'src/components/Hero.tsx',
      'src/pages/index.tsx',
      'src/deep/nested/dir/Widget.tsx',
    ]);
    const result = await GlobSearchTool.execute(
      { pattern: 'src/**/*.tsx' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('src/components/Hero.tsx');
    expect(files).toContain('src/pages/index.tsx');
    expect(files).toContain('src/deep/nested/dir/Widget.tsx');
  });

  it('matches specific filename patterns', async () => {
    scaffold([
      'app/components/HeroSection.tsx',
      'app/components/Footer.tsx',
      'app/components/HeroBanner.tsx',
    ]);
    const result = await GlobSearchTool.execute(
      { pattern: '**/*Hero*.tsx' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('app/components/HeroSection.tsx');
    expect(files).toContain('app/components/HeroBanner.tsx');
    expect(files).not.toContain('app/components/Footer.tsx');
  });

  it('excludes node_modules and .git', async () => {
    scaffold([
      'src/index.ts',
      'node_modules/pkg/index.ts',
      '.git/objects/abc',
    ]);
    const result = await GlobSearchTool.execute(
      { pattern: '**/*' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('src/index.ts');
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
    expect(files.some((f) => f.includes('.git'))).toBe(false);
  });

  it('returns empty array when no matches', async () => {
    scaffold(['readme.md']);
    const result = await GlobSearchTool.execute(
      { pattern: '**/*.ts' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('handles complex brace + doublestar patterns', async () => {
    scaffold([
      'app/page.tsx',
      'src/pages/index.ts',
      'pages/home.jsx',
    ]);
    const result = await GlobSearchTool.execute(
      { pattern: '**/{pages,app}/**/{index,home,page}.{ts,tsx,jsx}' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    const files = result.data as string[];
    expect(files).toContain('src/pages/index.ts');
    expect(files).toContain('pages/home.jsx');
  });
});
