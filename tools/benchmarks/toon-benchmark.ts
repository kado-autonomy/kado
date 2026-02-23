import { TOONEncoder } from '../../packages/orchestrator/src/toon/encoder.js';
import { TOONDecoder } from '../../packages/orchestrator/src/toon/decoder.js';
import { MessageType } from '../../packages/orchestrator/src/toon/protocol.js';
import { computeStats, printTable, type BenchmarkResult } from './stats.js';

const ITERATIONS = 1000;

function generatePayload(sizeBytes: number): string {
  const base = 'x'.repeat(sizeBytes);
  return base;
}

function benchmarkEncode(label: string, payloadSize: number): BenchmarkResult {
  const encoder = new TOONEncoder();
  const payload = { data: generatePayload(payloadSize) };
  const durations: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    encoder.encode(MessageType.INSTRUCTION, payload, i);
    durations.push(performance.now() - start);
  }

  return computeStats(`encode ${label}`, durations);
}

function benchmarkDecode(label: string, payloadSize: number): BenchmarkResult {
  const encoder = new TOONEncoder();
  const decoder = new TOONDecoder();
  const payload = { data: generatePayload(payloadSize) };
  const encoded = encoder.encode(MessageType.INSTRUCTION, payload, 0);
  const durations: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    decoder.decode(encoded);
    durations.push(performance.now() - start);
  }

  return computeStats(`decode ${label}`, durations);
}

function benchmarkRoundTrip(label: string, payloadSize: number): BenchmarkResult {
  const encoder = new TOONEncoder();
  const decoder = new TOONDecoder();
  const payload = { data: generatePayload(payloadSize) };
  const durations: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const encoded = encoder.encode(MessageType.INSTRUCTION, payload, i);
    decoder.decode(encoded);
    durations.push(performance.now() - start);
  }

  return computeStats(`roundtrip ${label}`, durations);
}

async function main() {
  console.log('=== TOON Encode/Decode Benchmark ===\n');
  console.log(`Iterations per benchmark: ${ITERATIONS}\n`);

  const sizes: Array<[string, number]> = [
    ['100B', 100],
    ['1KB', 1_024],
    ['10KB', 10_240],
    ['100KB', 102_400],
  ];

  const results: BenchmarkResult[] = [];

  for (const [label, size] of sizes) {
    results.push(benchmarkEncode(label, size));
    results.push(benchmarkDecode(label, size));
    results.push(benchmarkRoundTrip(label, size));
  }

  printTable(results);
}

main().catch(console.error);
