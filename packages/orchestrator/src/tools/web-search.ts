import type { Tool, ToolResult } from './types.js';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

function getApiKey(): string | undefined {
  return process.env['BRAVE_SEARCH_API_KEY'];
}

export const WebSearchTool: Tool = {
  definition: {
    name: 'web_search',
    description: 'Search the web for documentation and solutions',
    category: 'web',
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
      { name: 'maxResults', type: 'number', description: 'Max results (1-20, default 5)', required: false },
    ],
  },
  async execute(args, ctx): Promise<ToolResult> {
    const start = Date.now();
    const query = args.query as string;
    const maxResults = Math.min(Math.max((args.maxResults as number) ?? 5, 1), 20);

    if (!query?.trim()) {
      return { success: false, error: 'Search query is required', duration: Date.now() - start };
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error:
          'Brave Search API key not configured. Set the BRAVE_SEARCH_API_KEY environment variable. ' +
          'Get a free key at https://brave.com/search/api/',
        duration: Date.now() - start,
      };
    }

    try {
      const params = new URLSearchParams({ q: query, count: String(maxResults) });
      const res = await fetch(`${BRAVE_API_URL}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        signal: ctx.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Brave Search API returned ${res.status}: ${body}`);
      }

      const data = (await res.json()) as BraveSearchResponse;
      const results = (data.web?.results ?? []).map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.description ?? '',
      }));

      return { success: true, data: results, duration: Date.now() - start };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { success: false, error: 'Search was aborted', duration: Date.now() - start };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  },
};
