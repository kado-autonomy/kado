export interface VectorQueryResult {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  score: number;
}

const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = DEFAULT_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.includes('fetch') ||
            err.message.includes('network') ||
            err.message.includes('ECONNREFUSED')));
      if (!isNetworkError || i === retries - 1) throw lastError;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastError ?? new Error('Unknown error');
}

export class VectorBridge {
  private baseUrl: string;

  constructor(aiEngineUrl = 'http://localhost:8100') {
    this.baseUrl = aiEngineUrl.replace(/\/$/, '');
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetchWithRetry(`${this.baseUrl}/embeddings/encode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    const data = (await res.json()) as { embeddings: number[][] };
    return data.embeddings;
  }

  async upsert(
    id: string,
    text: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const res = await fetchWithRetry(`${this.baseUrl}/embeddings/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text, metadata }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upsert failed: ${res.status} ${text}`);
    }
  }

  async query(
    text: string,
    topK = 10
  ): Promise<VectorQueryResult[]> {
    const res = await fetchWithRetry(`${this.baseUrl}/embeddings/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, top_k: topK }),
    });
    const data = (await res.json()) as {
      results: Array<{
        id: string;
        score: number;
        metadata: Record<string, unknown>;
      }>;
    };
    return (data.results ?? []).map((r) => ({
      id: r.id,
      text: (r.metadata?.text as string) ?? '',
      metadata: r.metadata ?? {},
      score: r.score,
    }));
  }

  async delete(id: string): Promise<void> {
    const res = await fetchWithRetry(
      `${this.baseUrl}/embeddings/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Delete failed: ${res.status} ${text}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
