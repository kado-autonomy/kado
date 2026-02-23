# Plugin Development

Kado's plugin system lets you extend the agent with custom tools, UI panels, model providers, and external integrations.

## Plugin Types

| Type | Description |
|------|-------------|
| `tool` | Registers new tools the agent can invoke |
| `ui-panel` | Adds a custom panel to the renderer |
| `model-provider` | Provides an additional LLM backend |
| `integration` | Connects to external services (CI, issue trackers, etc.) |

## Plugin Manifest

Every plugin must include a `kado-plugin.json` manifest in its root directory:

```json
{
  "name": "my-custom-tool",
  "version": "1.0.0",
  "description": "Adds a database query tool to the agent",
  "author": "Your Name",
  "main": "dist/index.js",
  "type": "tool",
  "permissions": [
    "fs:read",
    "shell:execute",
    "network:outbound"
  ]
}
```

### Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique plugin identifier |
| `version` | `string` | Yes | Semver version |
| `description` | `string` | Yes | Short description shown in the plugin manager |
| `author` | `string` | No | Author name |
| `main` | `string` | Yes | Entry point relative to plugin root |
| `type` | `string` | Yes | One of: `tool`, `ui-panel`, `model-provider`, `integration` |
| `permissions` | `string[]` | Yes | Required permissions (see [Permissions](#permissions)) |

## Plugin API

Plugins receive a `PluginAPI` object when activated:

```typescript
interface PluginAPI {
  registerTool(tool: Tool): void;
  registerModelProvider(provider: LLMProvider): void;
  getConfig<T = unknown>(key: string): T | undefined;
  setConfig(key: string, value: unknown): void;
}
```

### `registerTool(tool)`

Register a new tool that the agent can invoke. The tool must implement the `Tool` interface:

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
```

### `registerModelProvider(provider)`

Register an LLM provider. The provider must implement the `LLMProvider` interface defined in `@kado/orchestrator`.

### `getConfig(key)` / `setConfig(key, value)`

Read and write plugin-scoped configuration. Values are persisted across sessions.

## Plugin Lifecycle

```typescript
interface PluginLifecycle {
  activate(api: PluginAPI): Promise<void>;
  deactivate(): Promise<void>;
}
```

Your plugin's entry point must export an object implementing `PluginLifecycle`:

```typescript
import type { PluginAPI, PluginLifecycle } from '@kado/orchestrator/plugins';

const plugin: PluginLifecycle = {
  async activate(api: PluginAPI) {
    // Register tools, providers, etc.
  },
  async deactivate() {
    // Clean up resources
  },
};

export default plugin;
```

## Permissions

Plugins run in a sandboxed environment with restricted access. Declare required permissions in the manifest:

| Permission | Grants |
|------------|--------|
| `fs:read` | Read files within the project directory |
| `fs:write` | Write/create files within the project directory |
| `shell:execute` | Execute shell commands (filtered by CommandFilter) |
| `network:outbound` | Make outbound HTTP requests (filtered by NetworkGuard) |
| `settings:read` | Read user settings |
| `settings:write` | Modify user settings |

The `PermissionManager` enforces these at runtime. Attempts to use undeclared permissions throw an error.

## Plugin Sandbox

- Plugins run in an isolated context managed by `PluginSandbox`.
- File system access is restricted to the active project directory.
- Shell commands are validated against the `CommandFilter` allow/deny list.
- Outbound network requests are checked by the `NetworkGuard`.
- Plugins cannot access credential storage directly.

## Example: Custom Model Provider

```typescript
import type { PluginAPI, PluginLifecycle } from '@kado/orchestrator/plugins';
import type { LLMProvider } from '@kado/orchestrator/llm';

class MyModelProvider implements LLMProvider {
  name = 'my-model';

  async chat(messages, options) {
    const apiKey = options.apiKey;
    const response = await fetch('https://api.mymodel.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, ...options }),
    });
    return response.json();
  }

  async streamChat(messages, options) {
    // Return an AsyncIterable of chunks
  }
}

const plugin: PluginLifecycle = {
  async activate(api: PluginAPI) {
    api.registerModelProvider(new MyModelProvider());
  },
  async deactivate() {},
};

export default plugin;
```

## Plugin Directory Structure

```
my-kado-plugin/
├── kado-plugin.json       # Manifest
├── package.json           # Node.js package metadata
├── tsconfig.json
├── src/
│   └── index.ts           # Entry point (activate / deactivate)
└── dist/
    └── index.js           # Compiled output (referenced by manifest "main")
```

## Installing Plugins

Place the plugin directory under the Kado plugins folder (configurable, default `~/.kado/plugins/`). The `PluginManager` discovers and loads plugins on startup. Plugins can also be enabled/disabled from the Settings panel.

## Plugin Status

Plugins can be in one of four states:

| Status | Meaning |
|--------|---------|
| `installed` | Discovered but not yet activated |
| `active` | Successfully activated and running |
| `inactive` | Explicitly disabled by the user |
| `error` | Failed to activate — check the error message |
