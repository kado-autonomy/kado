import { computeStats, printTable, type BenchmarkResult } from './stats.js';

const ITERATIONS = 1000;

function generateVector(dim: number): Float32Array {
  const vec = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    vec[i] = Math.random() * 2 - 1;
  }
  return vec;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

interface MockIndex {
  vectors: Float32Array[];
  ids: string[];
}

function buildIndex(size: number, dim: number): MockIndex {
  const vectors: Float32Array[] = [];
  const ids: string[] = [];
  for (let i = 0; i < size; i++) {
    vectors.push(generateVector(dim));
    ids.push(`chunk-${i}`);
  }
  return { vectors, ids };
}

function bruteForceSearch(
  index: MockIndex,
  query: Float32Array,
  topK: number
): Array<{ id: string; score: number }> {
  const scores: Array<{ id: string; score: number }> = [];
  for (let i = 0; i < index.vectors.length; i++) {
    const vec = index.vectors[i]!;
    scores.push({ id: index.ids[i]!, score: cosineSimilarity(query, vec) });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

function benchmarkSearch(indexSize: number): BenchmarkResult {
  const dim = 384;
  const topK = 10;
  const index = buildIndex(indexSize, dim);
  const query = generateVector(dim);
  const durations: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    bruteForceSearch(index, query, topK);
    durations.push(performance.now() - start);
  }

  return computeStats(`search (${indexSize} entries)`, durations);
}

function benchmarkIndexBuild(indexSize: number): BenchmarkResult {
  const dim = 384;
  const durations: number[] = [];
  const buildIterations = Math.min(ITERATIONS, 100);

  for (let i = 0; i < buildIterations; i++) {
    const start = performance.now();
    buildIndex(indexSize, dim);
    durations.push(performance.now() - start);
  }

  return computeStats(`build index (${indexSize} entries)`, durations);
}

async function main() {
  console.log('=== Semantic Search Benchmark ===\n');
  console.log(`Iterations per benchmark: ${ITERATIONS} (build: min(${ITERATIONS}, 100))\n`);

  const indexSizes = [100, 1_000, 10_000];
  const results: BenchmarkResult[] = [];

  for (const size of indexSizes) {
    results.push(benchmarkSearch(size));
    results.push(benchmarkIndexBuild(size));
  }

  printTable(results);
}

main().catch(console.error);
