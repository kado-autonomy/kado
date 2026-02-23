# OpenAI-Compatible Model Provider

Connect Kado to any API endpoint that implements the OpenAI chat completions interface.

## Supported Backends

- **vLLM** — high-throughput serving for open models
- **LocalAI** — local inference with multiple backends
- **Together AI** — hosted open-source models
- **Groq** — fast LPU inference
- **LM Studio** — desktop local inference
- **Ollama** (OpenAI-compatible mode)
- Any other server exposing `/v1/chat/completions`

## Configuration

After installing the plugin, configure it in Kado settings or by editing the plugin config:

| Key | Description | Default |
|-----|-------------|---------|
| `baseUrl` | Base URL of the API (include `/v1`) | `http://localhost:8000/v1` |
| `apiKey` | API key for authentication (leave empty if not required) | `""` |
| `modelId` | Model identifier to use for completions | `"default"` |

### Example Configurations

**vLLM (local):**
```json
{
  "baseUrl": "http://localhost:8000/v1",
  "apiKey": "",
  "modelId": "meta-llama/Llama-3-8B-Instruct"
}
```

**Together AI:**
```json
{
  "baseUrl": "https://api.together.xyz/v1",
  "apiKey": "your-together-api-key",
  "modelId": "meta-llama/Llama-3-70b-chat-hf"
}
```

**Groq:**
```json
{
  "baseUrl": "https://api.groq.com/openai/v1",
  "apiKey": "your-groq-api-key",
  "modelId": "llama3-70b-8192"
}
```

**LM Studio:**
```json
{
  "baseUrl": "http://localhost:1234/v1",
  "apiKey": "",
  "modelId": "local-model"
}
```

## Installation

1. In Kado, go to **Settings → Plugins**
2. Click **Install from directory**
3. Select this plugin's folder

The provider will appear in your model list once activated.
