export interface BenchmarkResult {
  name: string;
  iterations: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

export function computeStats(name: string, durations: number[]): BenchmarkResult {
  const sorted = [...durations].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    name,
    iterations: len,
    avgMs: durations.reduce((a, b) => a + b, 0) / len,
    p50Ms: sorted[Math.floor(len * 0.5)] ?? 0,
    p95Ms: sorted[Math.floor(len * 0.95)] ?? 0,
    p99Ms: sorted[Math.floor(len * 0.99)] ?? 0,
    minMs: sorted[0] ?? 0,
    maxMs: sorted[len - 1] ?? 0,
  };
}

export function printTable(results: BenchmarkResult[]): void {
  const headers = ['Benchmark', 'Iterations', 'Avg (ms)', 'P50 (ms)', 'P95 (ms)', 'P99 (ms)', 'Min (ms)', 'Max (ms)'];
  const rows = results.map((r) => [
    r.name,
    r.iterations.toString(),
    r.avgMs.toFixed(3),
    r.p50Ms.toFixed(3),
    r.p95Ms.toFixed(3),
    r.p99Ms.toFixed(3),
    r.minMs.toFixed(3),
    r.maxMs.toFixed(3),
  ]);

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length))
  );

  const sep = widths.map((w) => '-'.repeat(w + 2)).join('+');
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${cell.padEnd(widths[i] ?? 0)} `).join('|');

  console.log(formatRow(headers));
  console.log(sep);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}
