import type { Tool, ToolResult } from './types.js';

const AI_ENGINE_BASE = 'http://localhost:3001';

export const SemanticSearchTool: Tool = {
  definition: {
    name: 'semantic_search',
    description: 'Search code by meaning using vector index',
    category: 'search',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'topK', type: 'number', description: 'Max results (default 10)', required: false, default: 10 },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    try {
      const query = args.query as string;
      const topK = (args.topK as number) ?? 10;

      const healthCheck = AbortSignal.timeout(2000);
      try {
        await fetch(`${AI_ENGINE_BASE}/`, { signal: healthCheck, method: 'HEAD' });
      } catch {
        return {
          success: false,
          error: 'Semantic search unavailable (AI engine not running at ' + AI_ENGINE_BASE + '). Use grep_search or glob_search as fallback.',
          duration: Date.now() - start,
        };
      }

      const url = `${AI_ENGINE_BASE}/search?query=${encodeURIComponent(query)}&topK=${topK}&projectPath=${encodeURIComponent(ctx.projectPath)}`;
      const res = await fetch(url, { signal: ctx.signal });
      if (!res.ok) {
        throw new Error(`AI engine error ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { chunks?: unknown[] };
      return {
        success: true,
        data: data.chunks ?? [],
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
