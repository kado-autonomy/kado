# AI Engine API

The AI Engine is a Python FastAPI service that provides embedding generation, vector storage (FAISS), and reinforcement-learning feedback. By default it runs at `http://localhost:8100`.

## Health

### `GET /health`

Basic health check.

**Response** `200`:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### `GET /health/ready`

Readiness probe — confirms the FAISS index is loaded.

**Response** `200`:

```json
{
  "ready": true
}
```

## Embeddings

All embedding routes are prefixed with `/embeddings`.

### `POST /embeddings/encode`

Encode one or more text strings into embedding vectors.

**Request body:**

```json
{
  "texts": ["function add(a, b) { return a + b; }", "class UserService { ... }"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `texts` | `string[]` | Yes | Text strings to encode |

**Response** `200`:

```json
{
  "embeddings": [
    [0.012, -0.034, ...],
    [0.056, 0.078, ...]
  ]
}
```

Each inner array has `VECTOR_DIMENSIONS` floats (default: 384).

### `POST /embeddings/upsert`

Insert or update a document in the vector store.

**Request body:**

```json
{
  "id": "src/utils.ts",
  "text": "export function slugify(str: string) { ... }",
  "metadata": {
    "language": "typescript",
    "path": "src/utils.ts",
    "lines": "1-15"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique document identifier |
| `text` | `string` | Yes | Text to embed |
| `metadata` | `object` | No | Arbitrary metadata stored alongside the vector |

**Response** `200`:

```json
{
  "ok": true
}
```

### `POST /embeddings/query`

Query the vector store for semantically similar documents.

**Request body:**

```json
{
  "text": "how to validate user input",
  "top_k": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | Yes | Query text |
| `top_k` | `number` | No | Maximum results to return (default: 10) |

**Response** `200`:

```json
{
  "results": [
    {
      "id": "src/validation.ts",
      "score": 0.87,
      "metadata": { "language": "typescript", "path": "src/validation.ts" }
    },
    {
      "id": "src/forms/input.tsx",
      "score": 0.72,
      "metadata": { "language": "typescript", "path": "src/forms/input.tsx" }
    }
  ]
}
```

### `DELETE /embeddings/{id}`

Remove a document from the vector store.

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Path | Document identifier |

**Response** `200`:

```json
{
  "ok": true
}
```

**Response** `404`:

```json
{
  "detail": "Not found"
}
```

## Reinforcement Learning

All RL routes are prefixed with `/rl`.

### `POST /rl/log-action`

Log an agent action for RL tracking.

**Request body:**

```json
{
  "action": "file_edit",
  "context": {
    "file": "src/app.ts",
    "task": "add error handling"
  },
  "result": {
    "success": true,
    "lines_changed": 12
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `string` | Yes | Action name |
| `context` | `object` | No | Contextual information about the action |
| `result` | `object` | No | Outcome data |

**Response** `200`:

```json
{
  "action_id": "a1b2c3d4"
}
```

### `POST /rl/feedback`

Record user feedback (accept/reject) on a logged action.

**Request body:**

```json
{
  "action_id": "a1b2c3d4",
  "accepted": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action_id` | `string` | Yes | ID returned from `log-action` |
| `accepted` | `boolean` | Yes | Whether the user accepted the action's result |

**Response** `200`:

```json
{
  "ok": true
}
```

### `GET /rl/stats`

Retrieve aggregate RL statistics.

**Response** `200`:

```json
{
  "total_actions": 142,
  "accepted": 118,
  "rejected": 24,
  "acceptance_rate": 0.831,
  "actions_by_type": {
    "file_edit": 45,
    "file_write": 30,
    "shell_execute": 67
  }
}
```

### `POST /rl/optimize`

Trigger an RL optimisation pass over logged actions and feedback.

**Response** `200`:

```json
{
  "optimized": true,
  "adjustments": 5
}
```

## Error Responses

All endpoints return standard HTTP error codes with a JSON body:

```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — missing or invalid parameters |
| `404` | Resource not found |
| `500` | Internal server error |
