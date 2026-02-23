import type { CodeChunk } from './chunker.js';
import { detectLanguage } from './language-detector.js';

/**
 * WASM grammar files must be placed alongside the application bundle or in a
 * configured directory. Download them from the tree-sitter GitHub releases:
 *   - tree-sitter-javascript.wasm
 *   - tree-sitter-typescript.wasm  (also includes tsx)
 *   - tree-sitter-python.wasm
 *
 * Set the TREE_SITTER_WASM_DIR env var or place them in ./wasm/ relative to CWD.
 */

export interface ASTNode {
  type: 'function' | 'class' | 'method' | 'interface' | 'type_alias' | 'export';
  name: string;
  startLine: number;
  endLine: number;
  content: string;
  signature: string;
  children?: ASTNode[];
}

type TreeSitterParser = {
  setLanguage(lang: unknown): void;
  parse(input: string): TreeSitterTree;
};

type TreeSitterTree = {
  rootNode: TreeSitterNode;
};

type TreeSitterNode = {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  childCount: number;
  children: TreeSitterNode[];
  childForFieldName(name: string): TreeSitterNode | null;
  descendantsOfType(type: string): TreeSitterNode[];
};

type TreeSitterModule = {
  init(): Promise<void>;
  Language: {
    load(path: string): Promise<unknown>;
  };
  Parser?: new () => TreeSitterParser;
  default?: new () => TreeSitterParser;
};

const LANGUAGE_TO_WASM: Record<string, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  python: 'tree-sitter-python.wasm',
};

const SUPPORTED_LANGUAGES = new Set(Object.keys(LANGUAGE_TO_WASM));

export class ASTParser {
  private languages = new Map<string, unknown>();
  private parser: TreeSitterParser | null = null;
  private _initialized = false;
  private wasmDir: string;

  constructor(wasmDir?: string) {
    this.wasmDir = wasmDir ?? process.env['TREE_SITTER_WASM_DIR'] ?? './wasm';
  }

  get initialized(): boolean {
    return this._initialized;
  }

  async init(): Promise<boolean> {
    try {
      const mod = await import('web-tree-sitter') as unknown as TreeSitterModule;
      await mod.init();

      const ParserClass = mod.Parser ?? mod.default;
      if (!ParserClass) {
        throw new Error('Could not find Parser constructor in web-tree-sitter module');
      }
      this.parser = new (ParserClass as new () => TreeSitterParser)();

      for (const [lang, wasmFile] of Object.entries(LANGUAGE_TO_WASM)) {
        try {
          const { join } = await import('path');
          const wasmPath = join(this.wasmDir, wasmFile);
          const language = await mod.Language.load(wasmPath);
          this.languages.set(lang, language);
        } catch {
          // Grammar not available; will fall back to regex for this language
        }
      }

      this._initialized = this.languages.size > 0;
      return this._initialized;
    } catch {
      this._initialized = false;
      return false;
    }
  }

  supportsLanguage(language: string): boolean {
    return this.languages.has(language);
  }

  parseFile(content: string, language: string): ASTNode[] {
    if (!this._initialized || !this.parser || !this.languages.has(language)) {
      return [];
    }

    const lang = this.languages.get(language);
    this.parser.setLanguage(lang);
    const tree = this.parser.parse(content);

    if (language === 'python') {
      return this.extractPythonNodes(tree.rootNode, content);
    }
    return this.extractJsTsNodes(tree.rootNode, content, language);
  }

  extractChunks(content: string, filePath: string): CodeChunk[] {
    const language = detectLanguage(filePath);
    if (!SUPPORTED_LANGUAGES.has(language) || !this._initialized) {
      return [];
    }

    const nodes = this.parseFile(content, language);
    if (nodes.length === 0) return [];

    const chunks: CodeChunk[] = [];
    const seen = new Set<string>();

    for (const node of this.flattenNodes(nodes)) {
      const chunkId = `${filePath}:${node.startLine}:${hash(node.content)}`;
      if (seen.has(chunkId)) continue;
      seen.add(chunkId);

      chunks.push({
        id: chunkId,
        filePath,
        startLine: node.startLine,
        endLine: node.endLine,
        content: node.content,
        language,
        symbolName: node.name,
        symbolType: node.type,
      });
    }

    return chunks;
  }

  private flattenNodes(nodes: ASTNode[]): ASTNode[] {
    const result: ASTNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        result.push(...this.flattenNodes(node.children));
      }
    }
    return result;
  }

  private extractJsTsNodes(root: TreeSitterNode, content: string, _language: string): ASTNode[] {
    const lines = content.split('\n');
    const nodes: ASTNode[] = [];

    for (const child of root.children) {
      const extracted = this.extractJsTsNode(child, lines);
      if (extracted) nodes.push(extracted);
    }

    return nodes;
  }

  private extractJsTsNode(node: TreeSitterNode, lines: string[]): ASTNode | null {
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const content = lines.slice(startLine - 1, endLine).join('\n');

    switch (node.type) {
      case 'function_declaration':
      case 'generator_function_declaration': {
        const nameNode = node.childForFieldName('name');
        const name = nameNode?.text ?? '<anonymous>';
        return {
          type: 'function',
          name,
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        };
      }

      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const name = nameNode?.text ?? '<anonymous>';
        const methods = this.extractClassMethods(node, lines);
        return {
          type: 'class',
          name,
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
          children: methods,
        };
      }

      case 'export_statement': {
        const declaration = node.childForFieldName('declaration');
        if (declaration) {
          const inner = this.extractJsTsNode(declaration, lines);
          if (inner) return inner;
        }
        const nameNode = node.childForFieldName('name');
        return {
          type: 'export',
          name: nameNode?.text ?? 'default',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        };
      }

      case 'lexical_declaration':
      case 'variable_declaration': {
        if (this.isArrowOrFunctionExpression(node)) {
          const declarator = node.children.find(
            (c) => c.type === 'variable_declarator'
          );
          const nameNode = declarator?.childForFieldName('name');
          return {
            type: 'function',
            name: nameNode?.text ?? '<anonymous>',
            startLine,
            endLine,
            content,
            signature: extractSignatureLine(content),
          };
        }
        return null;
      }

      case 'interface_declaration': {
        const nameNode = node.childForFieldName('name');
        return {
          type: 'interface',
          name: nameNode?.text ?? '<anonymous>',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        };
      }

      case 'type_alias_declaration': {
        const nameNode = node.childForFieldName('name');
        return {
          type: 'type_alias',
          name: nameNode?.text ?? '<anonymous>',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        };
      }

      default:
        return null;
    }
  }

  private extractClassMethods(classNode: TreeSitterNode, lines: string[]): ASTNode[] {
    const methods: ASTNode[] = [];
    const body = classNode.childForFieldName('body');
    if (!body) return methods;

    for (const member of body.children) {
      if (
        member.type === 'method_definition' ||
        member.type === 'public_field_definition'
      ) {
        const nameNode = member.childForFieldName('name');
        const startLine = member.startPosition.row + 1;
        const endLine = member.endPosition.row + 1;
        const content = lines.slice(startLine - 1, endLine).join('\n');
        methods.push({
          type: 'method',
          name: nameNode?.text ?? '<anonymous>',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        });
      }
    }
    return methods;
  }

  private isArrowOrFunctionExpression(node: TreeSitterNode): boolean {
    for (const child of node.children) {
      if (child.type === 'variable_declarator') {
        const value = child.childForFieldName('value');
        if (
          value &&
          (value.type === 'arrow_function' ||
            value.type === 'function_expression' ||
            value.type === 'function')
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private extractPythonNodes(root: TreeSitterNode, content: string): ASTNode[] {
    const lines = content.split('\n');
    const nodes: ASTNode[] = [];

    for (const child of root.children) {
      const extracted = this.extractPythonNode(child, lines);
      if (extracted) nodes.push(extracted);
    }

    return nodes;
  }

  private extractPythonNode(node: TreeSitterNode, lines: string[]): ASTNode | null {
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const content = lines.slice(startLine - 1, endLine).join('\n');

    switch (node.type) {
      case 'function_definition': {
        const nameNode = node.childForFieldName('name');
        return {
          type: 'function',
          name: nameNode?.text ?? '<anonymous>',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        };
      }

      case 'class_definition': {
        const nameNode = node.childForFieldName('name');
        const methods = this.extractPythonClassMethods(node, lines);
        return {
          type: 'class',
          name: nameNode?.text ?? '<anonymous>',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
          children: methods,
        };
      }

      case 'decorated_definition': {
        const definition = node.children.find(
          (c) =>
            c.type === 'function_definition' || c.type === 'class_definition'
        );
        if (definition) {
          const inner = this.extractPythonNode(definition, lines);
          if (inner) {
            inner.startLine = startLine;
            inner.content = content;
            return inner;
          }
        }
        return null;
      }

      default:
        return null;
    }
  }

  private extractPythonClassMethods(classNode: TreeSitterNode, lines: string[]): ASTNode[] {
    const methods: ASTNode[] = [];
    const body = classNode.childForFieldName('body');
    if (!body) return methods;

    for (const member of body.children) {
      if (member.type === 'function_definition') {
        const nameNode = member.childForFieldName('name');
        const startLine = member.startPosition.row + 1;
        const endLine = member.endPosition.row + 1;
        const content = lines.slice(startLine - 1, endLine).join('\n');
        methods.push({
          type: 'method',
          name: nameNode?.text ?? '<anonymous>',
          startLine,
          endLine,
          content,
          signature: extractSignatureLine(content),
        });
      } else if (member.type === 'decorated_definition') {
        const fn = member.children.find((c) => c.type === 'function_definition');
        if (fn) {
          const nameNode = fn.childForFieldName('name');
          const startLine = member.startPosition.row + 1;
          const endLine = member.endPosition.row + 1;
          const content = lines.slice(startLine - 1, endLine).join('\n');
          methods.push({
            type: 'method',
            name: nameNode?.text ?? '<anonymous>',
            startLine,
            endLine,
            content,
            signature: extractSignatureLine(content),
          });
        }
      }
    }
    return methods;
  }
}

function extractSignatureLine(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  return firstLine.trim();
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}
