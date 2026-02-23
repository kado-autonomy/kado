import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { Tool, ToolResult } from './types.js';

export const FileReadTool: Tool = {
  definition: {
    name: 'file_read',
    description: 'Read file content with optional line range',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'File path', required: true },
      { name: 'startLine', type: 'number', description: 'Start line (1-based)', required: false },
      { name: 'endLine', type: 'number', description: 'End line (1-based)', required: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const path = args.path as string;
      const startLine = args.startLine as number | undefined;
      const endLine = args.endLine as number | undefined;
      const fullPath = resolve(ctx.projectPath, path);
      let content = await readFile(fullPath, 'utf-8');
      if (startLine != null || endLine != null) {
        const lines = content.split('\n');
        const s = (startLine ?? 1) - 1;
        const e = endLine ?? lines.length;
        content = lines.slice(s, e).join('\n');
      }
      return { success: true, data: content, duration: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
