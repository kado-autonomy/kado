import type { BrowserWindow } from "electron";
import { readCredential, readSettings } from "./credentials";
import { setOrchestrator, setRendererWindow } from "./orchestrator-bridge";

interface AppSettings {
  projectPath: string;
  defaultModel: string;
  ollamaUrl: string;
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: AppSettings = {
  projectPath: "",
  defaultModel: "gpt-5.2",
  ollamaUrl: "http://localhost:11434",
};

type ProviderKind = "openai" | "anthropic" | "google" | "ollama";

function resolveProviderKind(model: string): ProviderKind {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gemini")) return "google";
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
  return "ollama";
}

// Indirect import() avoids TypeScript static analysis on module resolution,
// which is necessary because @kado/orchestrator ships ESM while desktop is CJS.
// eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-explicit-any
const importESM: (specifier: string) => Promise<any> = new Function("s", "return import(s)") as never;

/**
 * Dynamically imports @kado/orchestrator and creates a fully wired Orchestrator
 * instance, then registers it with the bridge so the renderer can communicate
 * with it over IPC.
 */
export async function initOrchestrator(window: BrowserWindow): Promise<void> {
  setRendererWindow(window);

  const settings = await readSettings(DEFAULT_SETTINGS);
  const providerKind = resolveProviderKind(settings.defaultModel);

  let apiKey: string | null = null;
  if (providerKind === "openai") {
    apiKey = await readCredential("openai-api-key");
  } else if (providerKind === "anthropic") {
    apiKey = await readCredential("anthropic-api-key");
  } else if (providerKind === "google") {
    apiKey = await readCredential("google-api-key");
  }

  if (!apiKey && providerKind !== "ollama") {
    console.warn(
      `[kado] No API key found for ${providerKind}. ` +
      `Configure one in Settings → Model Settings. Orchestrator will not start.`
    );
    return;
  }

  try {
    const orchPkg = await importESM("@kado/orchestrator");
    const projectPath = settings.projectPath || process.cwd();

    const llmProvider = await buildLLMAdapter(providerKind, apiKey, settings);
    const toolRegistry = buildToolRegistryAdapter(orchPkg, projectPath);

    const orch = new orchPkg.Orchestrator({
      toolRegistry,
      llmProvider,
      projectPath,
    });

    setOrchestrator(orch);
    console.log(`[kado] Orchestrator initialized (provider: ${providerKind}, project: ${projectPath})`);
  } catch (err) {
    console.error("[kado] Failed to initialize orchestrator:", err);
  }
}

/**
 * Creates an LLM adapter that fully implements the LLMProvider interface
 * expected by the Orchestrator (complete, stream, countTokens).
 */
async function buildLLMAdapter(
  kind: ProviderKind,
  apiKey: string | null,
  settings: AppSettings,
) {
  const orchPkg = await importESM("@kado/orchestrator");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let provider: any;
  if (kind === "openai") {
    provider = new orchPkg.OpenAIProvider(apiKey);
  } else if (kind === "anthropic") {
    provider = new orchPkg.AnthropicProvider(apiKey);
  } else if (kind === "google") {
    provider = new orchPkg.GeminiProvider(apiKey);
  } else {
    provider = new orchPkg.OllamaProvider(settings.ollamaUrl, settings.defaultModel);
  }

  return {
    modelId: settings.defaultModel,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async complete(messages: any[], options?: Record<string, unknown>): Promise<any> {
      return provider.complete(messages, options);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async *stream(messages: any[], options?: Record<string, unknown>): AsyncGenerator<any> {
      if (typeof provider.stream === "function") {
        yield* provider.stream(messages, options);
      } else {
        const response = await provider.complete(messages, options);
        yield { content: response.content, done: true };
      }
    },

    countTokens(text: string): number {
      if (typeof provider.countTokens === "function") {
        return provider.countTokens(text);
      }
      return Math.ceil(text.length / 4);
    },
  };
}

/**
 * Creates a ToolRegistry adapter matching the Orchestrator's expected interface:
 *   execute(toolName, args) → Promise<unknown>
 *   has(name) → boolean
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildToolRegistryAdapter(orchPkg: any, initialProjectPath: string) {
  const registry = orchPkg.createDefaultRegistry();
  let projectPath = initialProjectPath;

  return {
    has(name: string): boolean {
      return registry.has(name);
    },
    async execute(toolName: string, args: Record<string, unknown>): Promise<unknown> {
      const tool = registry.get(toolName);
      if (!tool) throw new Error(`Tool "${toolName}" not found`);
      const result = await tool.execute(args, { projectPath });
      if (!result.success) throw new Error(result.error ?? `Tool "${toolName}" failed`);
      return result.data;
    },
    list() {
      return registry.list();
    },
    allKnownNames() {
      return registry.allKnownNames();
    },
    setProjectPath(path: string) {
      projectPath = path;
    },
    getProjectPath() {
      return projectPath;
    },
  };
}
