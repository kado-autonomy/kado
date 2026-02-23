# Orchestrator IPC API

The Electron main process exposes a typed API to the renderer via `contextBridge.exposeInMainWorld("kado", ...)`. Every call returns a promise resolving to an `IpcResult<T>`:

```typescript
interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## File System

### `fs:readDir`

Read the contents of a directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute directory path |

**Returns:** `IpcResult<string[]>` — array of entry names.

```typescript
const result = await window.kado.fs.readDir("/Users/me/project");
// result.data → ["src", "package.json", "README.md"]
```

### `fs:readFile`

Read a file's contents.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute file path |
| `encoding` | `BufferEncoding` | No | Encoding (default: `"utf-8"`) |

**Returns:** `IpcResult<string | Buffer>`

```typescript
const result = await window.kado.fs.readFile("/Users/me/project/src/index.ts");
// result.data → "import ..."
```

### `fs:writeFile`

Write content to a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute file path |
| `data` | `string \| Buffer` | Yes | Content to write |

**Returns:** `IpcResult<void>`

### `fs:stat`

Get file or directory metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute path |

**Returns:** `IpcResult<{ isFile: boolean; isDirectory: boolean; size: number }>`

### `fs:rename`

Rename or move a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `oldPath` | `string` | Yes | Current absolute path |
| `newPath` | `string` | Yes | New absolute path |

**Returns:** `IpcResult<void>`

### `fs:delete`

Delete a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute file path |

**Returns:** `IpcResult<void>`

### `fs:mkdir`

Create a directory (recursive).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute directory path |

**Returns:** `IpcResult<void>`

## Shell

### `shell:execute`

Execute a shell command.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | `string` | Yes | Command string |
| `cwd` | `string` | No | Working directory |

**Returns:** `IpcResult<{ stdout: string; stderr: string }>`

```typescript
const result = await window.kado.shell.execute("ls -la", "/Users/me/project");
// result.data → { stdout: "total 32\n...", stderr: "" }
```

## Dialog

### `dialog:openDirectory`

Open a native directory picker dialog.

**Parameters:** None.

**Returns:** `IpcResult<string | null>` — selected directory path, or `null` if cancelled.

```typescript
const result = await window.kado.dialog.openDirectory();
// result.data → "/Users/me/other-project" or null
```

## Settings

### `settings:load`

Load all settings.

**Parameters:** None.

**Returns:** `IpcResult<Record<string, unknown>>`

### `settings:save`

Merge and persist settings. Provided keys are merged into the existing settings object.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `settings` | `Record<string, unknown>` | Yes | Key-value pairs to merge |

**Returns:** `IpcResult<void>`

```typescript
await window.kado.settings.save({ theme: "dark", autoSave: true });
```

### `settings:get`

Get a single setting value.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Setting key |

**Returns:** `IpcResult<unknown>` — the value, or `null` if not set.

## Credentials

All credentials are encrypted with AES-256-GCM before being written to disk.

### `credentials:store`

Store an encrypted credential.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Credential name (e.g., `"openai_api_key"`) |
| `value` | `string` | Yes | Secret value |

**Returns:** `IpcResult<void>`

### `credentials:retrieve`

Retrieve and decrypt a credential.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Credential name |

**Returns:** `IpcResult<string | null>` — decrypted value, or `null` if not found.

### `credentials:delete`

Delete a stored credential.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Credential name |

**Returns:** `IpcResult<void>`

### `credentials:list`

List all stored credential keys.

**Parameters:** None.

**Returns:** `IpcResult<string[]>` — array of credential key names.
