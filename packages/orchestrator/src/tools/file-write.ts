import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import type { Tool, ToolResult } from './types.js';

export const FileWriteTool: Tool = {
  definition: {
    name: 'file_write',
    description: 'Write content to a file (creates dirs if needed)',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'File path', required: true },
      { name: 'content', type: 'string', description: 'Content to write', required: true },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const path = args.path as string;
      const content = args.content as string;
      const fullPath = resolve(ctx.projectPath, path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      return { success: true, data: { written: fullPath }, duration: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
