/**
 * OpenAI-Compatible Model Provider Plugin
 *
 * Connects Kado to any API endpoint that implements the OpenAI chat completions
 * interface (vLLM, LocalAI, Together, Groq, LM Studio, Ollama with OpenAI compat, etc.)
 */

async function activate(api) {
  const baseUrl = api.getConfig("baseUrl") ?? "http://localhost:8000/v1";
  const apiKey = api.getConfig("apiKey") ?? "";
  const modelId = api.getConfig("modelId") ?? "default";

  const provider = {
    id: `openai-compat-${modelId}`,
    name: `OpenAI-Compatible (${modelId})`,

    async chat(messages, options = {}) {
      const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

      const body = {
        model: modelId,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: options.stream ?? false,
      };

      const headers = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI-compatible API error ${response.status}: ${errorBody}`
        );
      }

      if (options.stream) {
        return streamResponse(response);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content ?? "",
        role: choice?.message?.role ?? "assistant",
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    },

    async listModels() {
      const url = `${baseUrl.replace(/\/+$/, "")}/models`;
      const headers = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      try {
        const response = await fetch(url, { headers });
        if (!response.ok) return [modelId];
        const data = await response.json();
        return (data.data ?? []).map((m) => m.id);
      } catch {
        return [modelId];
      }
    },
  };

  api.registerModelProvider(provider);
}

async function* streamResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield { content: delta.content, role: "assistant" };
          }
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function deactivate() {}

module.exports = { activate, deactivate };
