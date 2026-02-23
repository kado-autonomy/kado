import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { VectorBridge } from './vector-bridge.js';

export interface Rule {
  id: string;
  title: string;
  content: string;
  category: 'coding-standard' | 'convention' | 'instruction';
  enabled: boolean;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  indexed: boolean;
}

export interface KnowledgeResult {
  id: string;
  content: string;
  score: number;
  source: string;
}

const RULES_FILE = 'rules.json';
const DOCS_DIR = 'documents';
const DOC_PREFIX = 'kb:';
const PROJECT_FILES = ['KADO.md', 'README.md', 'CONTRIBUTING.md', '.kado.md'];

export class KnowledgeBase {
  constructor(
    private storagePath: string,
    private vectorBridge: VectorBridge
  ) {}

  private rulesPath(): string {
    return join(this.storagePath, RULES_FILE);
  }

  private docsPath(): string {
    return join(this.storagePath, DOCS_DIR);
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
    await mkdir(this.docsPath(), { recursive: true });
  }

  async loadProjectInstructions(projectPath: string): Promise<string | null> {
    for (const name of PROJECT_FILES) {
      const path = join(projectPath, name);
      try {
        const content = await readFile(path, 'utf-8');
        return content;
      } catch {
        continue;
      }
    }
    return null;
  }

  private async loadRules(): Promise<Rule[]> {
    try {
      const data = await readFile(this.rulesPath(), 'utf-8');
      return JSON.parse(data) as Rule[];
    } catch {
      return [];
    }
  }

  private async saveRules(rules: Rule[]): Promise<void> {
    await this.ensureDir();
    await writeFile(this.rulesPath(), JSON.stringify(rules, null, 2));
  }

  async addRule(rule: Omit<Rule, 'id'> & Partial<Pick<Rule, 'id'>>): Promise<void> {
    const rules = await this.loadRules();
    const full: Rule = {
      ...rule,
      id: rule.id ?? randomUUID(),
      enabled: rule.enabled ?? true,
    };
    rules.push(full);
    await this.saveRules(rules);
  }

  async getRules(): Promise<Rule[]> {
    return this.loadRules();
  }

  async deleteRule(id: string): Promise<void> {
    const rules = await this.loadRules();
    const filtered = rules.filter((r) => r.id !== id);
    await this.saveRules(filtered);
  }

  async addDocument(
    doc: Omit<KnowledgeDocument, 'id' | 'indexed'> & Partial<Pick<KnowledgeDocument, 'id'>>
  ): Promise<void> {
    await this.ensureDir();
    const id = doc.id ?? randomUUID();
    const full: KnowledgeDocument = {
      ...doc,
      id,
      indexed: true,
    };
    const path = join(this.docsPath(), `${id}.json`);
    await writeFile(path, JSON.stringify(full, null, 2));
    await this.vectorBridge.upsert(`${DOC_PREFIX}${id}`, doc.content, {
      id,
      title: doc.title,
      text: doc.content,
      source: doc.source,
    });
  }

  async searchKnowledge(
    query: string,
    topK = 10
  ): Promise<KnowledgeResult[]> {
    const results = await this.vectorBridge.query(query, topK);
    return results
      .filter((r) => r.id.startsWith(DOC_PREFIX))
      .map((r) => ({
        id: r.id.replace(DOC_PREFIX, ''),
        content: r.text,
        score: r.score,
        source: (r.metadata?.source as string) ?? '',
      }));
  }

  async deleteDocument(id: string): Promise<void> {
    await this.vectorBridge.delete(`${DOC_PREFIX}${id}`);
    const path = join(this.docsPath(), `${id}.json`);
    await unlink(path).catch(() => {});
  }
}
