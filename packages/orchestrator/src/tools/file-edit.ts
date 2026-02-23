import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { Tool, ToolResult } from './types.js';

export const FileEditTool: Tool = {
  definition: {
    name: 'file_edit',
    description: 'Apply targeted string replacement in a file',
    category: 'file',
    parameters: [
      { name: 'path', type: 'string', description: 'File path', required: true },
      { name: 'oldString', type: 'string', description: 'String to replace', required: true },
      { name: 'newString', type: 'string', description: 'Replacement string', required: true },
      { name: 'replaceAll', type: 'boolean', description: 'Replace all occurrences', required: false, default: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const path = args.path as string;
      const oldString = args.oldString as string;
      const newString = args.newString as string;
      const replaceAll = (args.replaceAll as boolean) ?? false;
      const fullPath = resolve(ctx.projectPath, path);
      let content = await readFile(fullPath, 'utf-8');
      const matched = content.includes(oldString);
      let replacements = 0;
      if (replaceAll) {
        const parts = content.split(oldString);
        replacements = parts.length - 1;
        content = parts.join(newString);
      } else {
        if (matched) {
          content = content.replace(oldString, newString);
          replacements = 1;
        }
      }
      await writeFile(fullPath, content, 'utf-8');
      return {
        success: true,
        data: { matched, replacements },
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
