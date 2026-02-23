import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorBridge } from '../../memory/vector-bridge.js';

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    (input, init) => {
      const url = typeof input === 'string' ? input : (input as URL).toString();
      return Promise.resolve(handler(url, init));
    }
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('VectorBridge integration', () => {
  let bridge: VectorBridge;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    bridge = new VectorBridge('http://localhost:8100');
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  describe('embed', () => {
    it('sends texts and returns embeddings', async () => {
      const embeddings = [[0.1, 0.2], [0.3, 0.4]];
      fetchSpy = mockFetch((url) => {
        if (url.includes('/embeddings/encode')) {
          return jsonResponse({ embeddings });
        }
        return jsonResponse({}, 404);
      });

      const result = await bridge.embed(['hello', 'world']);
      expect(result).toEqual(embeddings);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8100/embeddings/encode',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ texts: ['hello', 'world'] }),
        })
      );
    });

    it('throws on HTTP error', async () => {
      fetchSpy = mockFetch(() => {
        return new Response('Internal Server Error', { status: 500 });
      });

      await expect(bridge.embed(['fail'])).rejects.toThrow('HTTP 500');
    });
  });

  describe('query', () => {
    it('sends query text and returns scored results', async () => {
      const results = [
        { id: 'chunk-1', score: 0.95, metadata: { filePath: 'a.ts', text: 'some code' } },
        { id: 'chunk-2', score: 0.80, metadata: { filePath: 'b.ts', text: 'other code' } },
      ];

      fetchSpy = mockFetch((url) => {
        if (url.includes('/embeddings/query')) {
          return jsonResponse({ results });
        }
        return jsonResponse({}, 404);
      });

      const res = await bridge.query('search term', 5);
      expect(res).toHaveLength(2);
      expect(res[0]!.id).toBe('chunk-1');
      expect(res[0]!.score).toBe(0.95);
      expect(res[1]!.text).toBe('other code');
    });

    it('returns empty array when results is null', async () => {
      fetchSpy = mockFetch(() => jsonResponse({ results: null }));
      const res = await bridge.query('empty');
      expect(res).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('sends id, text, and metadata', async () => {
      fetchSpy = mockFetch((url) => {
        if (url.includes('/embeddings/upsert')) {
          return jsonResponse({ ok: true });
        }
        return jsonResponse({}, 404);
      });

      await expect(
        bridge.upsert('id-1', 'some text', { filePath: 'test.ts' })
      ).resolves.toBeUndefined();

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8100/embeddings/upsert',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ id: 'id-1', text: 'some text', metadata: { filePath: 'test.ts' } }),
        })
      );
    });
  });

  describe('error handling - AI engine unavailable', () => {
    it('retries on network error and eventually throws', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('fetch failed')
      );

      await expect(bridge.embed(['test'])).rejects.toThrow('fetch failed');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('does not retry on non-network errors', async () => {
      fetchSpy = mockFetch(() => {
        return new Response('Bad Request', { status: 400 });
      });

      await expect(bridge.query('test')).rejects.toThrow('HTTP 400');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    it('isHealthy returns false on timeout', async () => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10))
      );

      const healthy = await bridge.isHealthy();
      expect(healthy).toBe(false);
    });

    it('isHealthy returns true when server responds', async () => {
      fetchSpy = mockFetch(() => new Response('OK', { status: 200 }));
      const healthy = await bridge.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe('delete', () => {
    it('sends DELETE request', async () => {
      fetchSpy = mockFetch((url) => {
        if (url.includes('/embeddings/')) {
          return new Response(null, { status: 204 });
        }
        return jsonResponse({}, 404);
      });

      await expect(bridge.delete('chunk-1')).resolves.toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/embeddings/chunk-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('does not throw on 404 (already deleted)', async () => {
      fetchSpy = mockFetch(() => new Response('Not Found', { status: 404 }));
      await expect(bridge.delete('missing')).resolves.toBeUndefined();
    });
  });
});
