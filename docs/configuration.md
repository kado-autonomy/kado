# Configuration

Kado stores all user configuration in the `~/.kado/` directory.

## File Locations

| File / Directory | Purpose |
|------------------|---------|
| `~/.kado/settings.json` | User preferences and general settings |
| `~/.kado/credentials/` | AES-256-GCM encrypted API keys (`.enc` files) |
| `~/.kado/credentials/.salt` | Encryption salt (auto-generated on first use) |

## General Settings

Settings are stored as a flat JSON object in `~/.kado/settings.json`. All fields are optional and fall back to built-in defaults.

```jsonc
{
  "projectPath": "/Users/you/projects/my-app",
  "maxTokenBudget": 100000,
  "maxSubagents": 4,
  "autoSave": true,
  "defaultModel": "gpt-4o",
  "embeddingModel": "text-embedding-3-small",
  "theme": "system",
  "sidebarVisible": true,
  "bottomPanelVisible": true
}
```

### Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `projectPath` | `string` | `null` | Path to the active project directory |
| `maxTokenBudget` | `number` | `100000` | Maximum token budget per agent request |
| `maxSubagents` | `number` | `4` | Maximum concurrent specialist subagents |
| `autoSave` | `boolean` | `true` | Auto-save files after agent edits |
| `defaultModel` | `string` | `"gpt-4o"` | Default LLM for the agent loop |
| `embeddingModel` | `string` | `"text-embedding-3-small"` | Model used for cloud embeddings |
| `theme` | `string` | `"system"` | Colour scheme: `"light"`, `"dark"`, or `"system"` |
| `sidebarVisible` | `boolean` | `true` | Whether the sidebar is open |
| `bottomPanelVisible` | `boolean` | `true` | Whether the bottom panel is open |

Settings are loaded and saved via IPC channels `settings:load`, `settings:save`, and `settings:get`.

## Credential Storage

API keys and other secrets are encrypted at rest using AES-256-GCM.

- An encryption key is derived from a machine-specific identifier (hostname + arch + CPU model) via PBKDF2 (100,000 iterations, SHA-256).
- Each credential is stored as a separate `.enc` file under `~/.kado/credentials/`.
- The filename is the base64url-encoded key name.

### Managing Credentials

Credentials can be managed through the Settings > AI Models panel or programmatically via IPC:

```typescript
// Store
await window.kado.credentials.store("openai_api_key", "sk-...");

// Retrieve
const result = await window.kado.credentials.retrieve("openai_api_key");
// result.data → "sk-..." or null

// Delete
await window.kado.credentials.delete("openai_api_key");

// List all stored keys
const keys = await window.kado.credentials.list();
// keys.data → ["openai_api_key", "anthropic_api_key"]
```

## Model Configuration

### Supported Providers

| Provider | Key Name | Notes |
|----------|----------|-------|
| OpenAI | `openai_api_key` | GPT-4o, GPT-4, GPT-3.5, embedding models |
| Anthropic | `anthropic_api_key` | Claude 3.5, Claude 3 |
| Ollama | — | Local models, no API key required |

### Ollama Configuration

If using a local Ollama instance, set the base URL in settings:

```jsonc
{
  "ollamaUrl": "http://localhost:11434"
}
```

### Model Preference Order

The orchestrator's `ModelSelector` tries models in preference order. Configure this in Settings > AI Models by dragging models to reorder, or set it directly:

```jsonc
{
  "modelPreference": [
    "gpt-4o",
    "claude-3-5-sonnet",
    "llama3.1:70b"
  ]
}
```

The selector falls back to the next model if the preferred one is unavailable or returns an error.

## AI Engine Environment

The Python ai-engine reads its configuration from `packages/ai-engine/.env`. Copy `.env.example` as a starting point.

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8100` | Listening port |
| `DEBUG` | `false` | Enable debug logging |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformer model for local embeddings |
| `VECTOR_DIMENSIONS` | `384` | Embedding vector size (must match model) |
| `FAISS_INDEX_PATH` | `./data/faiss_index` | Disk path for FAISS index persistence |
| `LOG_LEVEL` | `INFO` | Python log level |

These values are loaded via `pydantic-settings` and can also be set as real environment variables (which take precedence over the `.env` file).
