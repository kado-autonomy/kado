import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileEditTool } from '../file-edit.js';

describe('FileEditTool', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'file-edit-test-'));
    projectPath = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('performs single replacement', async () => {
    const filePath = 'single.txt';
    writeFileSync(join(tmpDir, filePath), 'foo bar baz');
    const result = await FileEditTool.execute(
      { path: filePath, oldString: 'bar', newString: 'qux' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ matched: true, replacements: 1 });
    expect(readFileSync(join(tmpDir, filePath), 'utf-8')).toBe('foo qux baz');
  });

  it('performs replace all', async () => {
    const filePath = 'replaceall.txt';
    writeFileSync(join(tmpDir, filePath), 'x x x x');
    const result = await FileEditTool.execute(
      { path: filePath, oldString: 'x', newString: 'y', replaceAll: true },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ matched: true, replacements: 4 });
    expect(readFileSync(join(tmpDir, filePath), 'utf-8')).toBe('y y y y');
  });

  it('handles string not found', async () => {
    const filePath = 'nofound.txt';
    writeFileSync(join(tmpDir, filePath), 'original content');
    const result = await FileEditTool.execute(
      { path: filePath, oldString: 'missing', newString: 'replacement' },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ matched: false, replacements: 0 });
    expect(readFileSync(join(tmpDir, filePath), 'utf-8')).toBe('original content');
  });

  it('returns error when file not found', async () => {
    const result = await FileEditTool.execute(
      { path: 'nonexistent.txt', oldString: 'a', newString: 'b' },
      { projectPath }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
