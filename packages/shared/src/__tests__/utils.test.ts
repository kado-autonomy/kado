import { describe, it, expect } from 'vitest';
import { generateId, normalizePath, truncate, clamp } from '../utils.js';

describe('utils', () => {
  describe('generateId', () => {
    it('returns unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('returns UUID-like format', () => {
      const id = generateId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('normalizePath', () => {
    it('replaces backslashes with forward slashes', () => {
      expect(normalizePath('a\\b\\c')).toBe('a/b/c');
    });

    it('collapses multiple slashes', () => {
      expect(normalizePath('a//b///c')).toBe('a/b/c');
    });

    it('removes trailing slash when length > 1', () => {
      expect(normalizePath('/a/b/')).toBe('/a/b');
    });

    it('keeps single slash', () => {
      expect(normalizePath('/')).toBe('/');
    });
  });

  describe('truncate', () => {
    it('returns string unchanged when within maxLen', () => {
      expect(truncate('short', 10)).toBe('short');
    });

    it('truncates with ellipsis when exceeding maxLen', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('handles exact maxLen', () => {
      expect(truncate('abc', 3)).toBe('abc');
    });
  });

  describe('clamp', () => {
    it('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('returns min when value below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('returns max when value above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles value at boundaries', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });
});
