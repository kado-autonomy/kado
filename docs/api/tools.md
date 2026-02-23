# Tool System Reference

The orchestrator exposes a pluggable tool system. Each tool implements the `Tool` interface and is registered with the `ToolRegistry`.

## Tool Interface

```typescript
interface Tool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  category: 'file' | 'search' | 'execution' | 'analysis' | 'web';
}

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: unknown;
}

interface ToolContext {
  projectPath: string;
  signal?: AbortSignal;
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;  // milliseconds
}
```

## Built-in Tools

### `file_read`

Read file content with optional line range.

**Category:** `file`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | `string` | Yes | — | File path (relative to project root) |
| `startLine` | `number` | No | `1` | Start line (1-based) |
| `endLine` | `number` | No | EOF | End line (1-based) |

**Returns:** `{ data: string }` — file content (or the requested line range).

---

### `file_write`

Write content to a file, creating parent directories as needed.

**Category:** `file`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | File path (relative to project root) |
| `content` | `string` | Yes | Content to write |

**Returns:** `{ data: { written: string } }` — absolute path of the written file.

---

### `file_edit`

Apply a targeted string replacement in a file.

**Category:** `file`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | `string` | Yes | — | File path |
| `oldString` | `string` | Yes | — | Exact string to find |
| `newString` | `string` | Yes | — | Replacement string |
| `replaceAll` | `boolean` | No | `false` | Replace all occurrences |

**Returns:** `{ data: { matched: boolean, replacements: number } }`

---

### `glob_search`

Find files matching a glob pattern.

**Category:** `search`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pattern` | `string` | Yes | — | Glob pattern (e.g., `**/*.ts`) |
| `cwd` | `string` | No | project root | Base directory for the search |

**Returns:** `{ data: string[] }` — array of matching relative file paths.

---

### `grep_search`

Search file contents by regular expression.

**Category:** `search`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pattern` | `string` | Yes | — | Regex pattern |
| `path` | `string` | No | `.` | Directory to search |
| `fileGlob` | `string` | No | all files | File name glob filter (e.g., `*.ts`) |

**Returns:** `{ data: GrepMatch[] }` where each match is:

```typescript
{ file: string; line: number; content: string }
```

Automatically excludes `node_modules`, `.git`, `dist`, and `build` directories.

---

### `shell_execute`

Run a shell command.

**Category:** `execution`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `command` | `string` | Yes | — | Command to execute |
| `cwd` | `string` | No | project root | Working directory |
| `timeout` | `number` | No | `30` | Timeout in seconds |

**Returns:** `{ data: { stdout: string, stderr: string, exitCode: number } }`

The tool respects `AbortSignal` for cancellation. Exit code 124 indicates a timeout kill.

---

### `test_runner`

Run the project's test suite. Auto-detects Vitest, Jest, or pytest.

**Category:** `execution`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | `string` | No | Override the auto-detected test command |
| `testPath` | `string` | No | Specific test file or pattern |

**Returns:** `{ data: { passed: number, failed: number, total: number, output: string } }`

Detection order:
1. `vitest.config.ts` / `vitest.config.js` → `npx vitest run`
2. `jest.config.*` → `npx jest --passWithNoTests`
3. `pyproject.toml` / `pytest.ini` → `python -m pytest -v`

---

### `lint`

Run the project's linter. Auto-detects ESLint or Ruff.

**Category:** `analysis`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `files` | `string[]` | No | all files | Specific files to lint |
| `fix` | `boolean` | No | `false` | Auto-fix issues |

**Returns:** `{ data: { errors: number, warnings: number, fixed: number, output: string } }`

---

### `semantic_search`

Search the codebase by meaning using the AI Engine's vector index.

**Category:** `search`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | `string` | Yes | — | Natural-language search query |
| `topK` | `number` | No | `10` | Maximum results |

**Returns:** `{ data: Chunk[] }` — array of semantically similar code chunks.

Requires the AI Engine to be running at `http://localhost:3001`.

---

### `web_search`

Search the web for documentation and solutions.

**Category:** `web`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Search query |
| `maxResults` | `number` | No | Maximum results |

**Returns:** Not yet implemented — returns an error indicating the tool is not configured.

## Tool Registry

The `ToolRegistry` (`packages/orchestrator/src/tools/registry.ts`) manages tool discovery and invocation:

```typescript
const registry = new ToolRegistry();
registry.register(FileReadTool);
registry.register(FileWriteTool);
// ...

const result = await registry.invoke("file_read", { path: "src/index.ts" }, ctx);
```

Plugins can register additional tools via `api.registerTool(tool)`.
