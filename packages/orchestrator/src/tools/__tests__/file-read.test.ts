import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileReadTool } from '../file-read.js';

describe('FileReadTool', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'file-read-test-'));
    projectPath = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('reads a file successfully', async () => {
    const filePath = 'test.txt';
    const content = 'hello world\nline two';
    writeFileSync(join(tmpDir, filePath), content);
    const result = await FileReadTool.execute(
      { path: filePath },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toBe(content);
    expect(typeof result.duration).toBe('number');
  });

  it('reads with line range', async () => {
    const filePath = 'lines.txt';
    const lines = ['line1', 'line2', 'line3', 'line4', 'line5'];
    writeFileSync(join(tmpDir, filePath), lines.join('\n'));
    const result = await FileReadTool.execute(
      { path: filePath, startLine: 2, endLine: 4 },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toBe('line2\nline3\nline4');
  });

  it('reads from startLine only', async () => {
    const filePath = 'partial.txt';
    writeFileSync(join(tmpDir, filePath), 'a\nb\nc\nd');
    const result = await FileReadTool.execute(
      { path: filePath, startLine: 3 },
      { projectPath }
    );
    expect(result.success).toBe(true);
    expect(result.data).toBe('c\nd');
  });

  it('returns error when file not found', async () => {
    const result = await FileReadTool.execute(
      { path: 'nonexistent.txt' },
      { projectPath }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/ENOENT|no such file|not found/i);
  });
});
