import { chunkFile } from '../../packages/orchestrator/src/indexing/chunker.js';
import { computeStats, printTable, type BenchmarkResult } from './stats.js';

const ITERATIONS = 500;

const SAMPLE_TS = `
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface Config {
  host: string;
  port: number;
  debug: boolean;
}

export class Server {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async start(): Promise<void> {
    console.log(\`Starting server on \${this.config.host}:\${this.config.port}\`);
    await this.loadPlugins();
    await this.bindRoutes();
  }

  private async loadPlugins(): Promise<void> {
    const plugins = await readFile(join('.', 'plugins.json'), 'utf-8');
    console.log('Loaded plugins:', plugins);
  }

  private async bindRoutes(): Promise<void> {
    console.log('Routes bound');
  }

  async stop(): Promise<void> {
    console.log('Server stopped');
  }
}

export async function createServer(config: Config): Promise<Server> {
  const server = new Server(config);
  await server.start();
  return server;
}

export const DEFAULT_CONFIG: Config = {
  host: 'localhost',
  port: 3000,
  debug: false,
};

export default createServer;
`.trim();

const SAMPLE_JS = `
const express = require('express');
const cors = require('cors');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/data', async (req, res) => {
    try {
      const result = await processData(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

async function processData(data) {
  const validated = validateInput(data);
  const transformed = transformData(validated);
  return { success: true, data: transformed };
}

function validateInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid input');
  }
  return data;
}

function transformData(data) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k.toUpperCase(), v])
  );
}

module.exports = { createApp };
`.trim();

const SAMPLE_PY = `
import os
from pathlib import Path
from typing import List, Optional

class FileProcessor:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self._cache = {}

    def process_all(self) -> List[dict]:
        results = []
        for entry in self.root_dir.rglob("*"):
            if entry.is_file():
                result = self.process_file(entry)
                if result:
                    results.append(result)
        return results

    def process_file(self, path: Path) -> Optional[dict]:
        if path.suffix not in ('.py', '.txt', '.md'):
            return None
        content = path.read_text()
        return {
            'path': str(path),
            'size': len(content),
            'lines': content.count('\\n') + 1,
        }

    def get_cached(self, key: str):
        return self._cache.get(key)

    def set_cached(self, key: str, value):
        self._cache[key] = value


def analyze_directory(directory: str) -> dict:
    processor = FileProcessor(directory)
    results = processor.process_all()
    total_size = sum(r['size'] for r in results)
    total_lines = sum(r['lines'] for r in results)
    return {
        'files': len(results),
        'total_size': total_size,
        'total_lines': total_lines,
    }


async def async_analyze(directory: str) -> dict:
    return analyze_directory(directory)
`.trim();

const SAMPLES: Array<{ name: string; filePath: string; content: string }> = [
  { name: 'TypeScript', filePath: 'server.ts', content: SAMPLE_TS },
  { name: 'JavaScript', filePath: 'app.js', content: SAMPLE_JS },
  { name: 'Python', filePath: 'processor.py', content: SAMPLE_PY },
];

function benchmarkParsing(sample: { name: string; filePath: string; content: string }): BenchmarkResult {
  const durations: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    chunkFile(sample.filePath, sample.content);
    durations.push(performance.now() - start);
  }

  return computeStats(`parse+chunk ${sample.name}`, durations);
}

function benchmarkThroughput(samples: typeof SAMPLES): BenchmarkResult {
  const durations: number[] = [];
  let totalChunks = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    for (const sample of samples) {
      const chunks = chunkFile(sample.filePath, sample.content);
      totalChunks += chunks.length;
    }
    durations.push(performance.now() - start);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const filesPerSecond = (samples.length / avgDuration) * 1000;
  const chunksPerSecond = (totalChunks / ITERATIONS / avgDuration) * 1000;

  console.log(`\nThroughput: ${filesPerSecond.toFixed(1)} files/sec, ${chunksPerSecond.toFixed(1)} chunks/sec`);

  return computeStats('throughput (all languages)', durations);
}

async function main() {
  console.log('=== Code Indexing Benchmark ===\n');
  console.log(`Iterations per benchmark: ${ITERATIONS}\n`);

  const results: BenchmarkResult[] = [];

  for (const sample of SAMPLES) {
    const chunks = chunkFile(sample.filePath, sample.content);
    console.log(`${sample.name}: ${sample.content.split('\n').length} lines -> ${chunks.length} chunks`);
    results.push(benchmarkParsing(sample));
  }

  results.push(benchmarkThroughput(SAMPLES));

  console.log('');
  printTable(results);
}

main().catch(console.error);
