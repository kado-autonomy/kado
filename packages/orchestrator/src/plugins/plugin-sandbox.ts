import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import type { PluginManifest, PluginAPI, PluginLifecycle } from './plugin-types.js';
import type { Tool } from '../tools/types.js';
import type { LLMProvider } from '../llm/provider.js';

export interface OrchestratorRef {
  registerTool?(tool: Tool): void;
  registerModelProvider?(provider: LLMProvider): void;
}

export class PluginSandbox {
  private pluginDir: string;
  private config: Map<string, unknown> = new Map();
  private tools: Tool[] = [];
  private providers: LLMProvider[] = [];
  private orchestrator: OrchestratorRef;

  constructor(pluginDir: string, orchestrator: OrchestratorRef) {
    this.pluginDir = resolve(pluginDir);
    this.orchestrator = orchestrator;
  }

  createAPI(_manifest: PluginManifest): PluginAPI {
    const self = this;
    return {
      registerTool(tool: Tool): void {
        self.tools.push(tool);
        self.orchestrator.registerTool?.(tool);
      },
      registerModelProvider(provider: LLMProvider): void {
        self.providers.push(provider);
        self.orchestrator.registerModelProvider?.(provider);
      },
      getConfig<T = unknown>(key: string): T | undefined {
        return self.config.get(key) as T | undefined;
      },
      setConfig(key: string, value: unknown): void {
        self.config.set(key, value);
      },
    };
  }

  async loadAndActivate(manifestPath: string): Promise<PluginLifecycle> {
    const pluginDir = resolve(manifestPath, '..');
    const manifest = await this.loadManifest(manifestPath);
    this.validateManifest(manifest);

    const mainPath = join(pluginDir, manifest.main);
    const require = createRequire(import.meta.url);
    const module = require(mainPath);
    const plugin = module.default ?? module;

    if (typeof plugin?.activate !== 'function') {
      throw new Error(`Plugin ${manifest.name} must export activate(api) function`);
    }

    const api = this.createAPI(manifest);
    await plugin.activate(api);

    return {
      activate: async () => {
        await plugin.activate(api);
      },
      deactivate: async () => {
        if (typeof plugin.deactivate === 'function') {
          await plugin.deactivate();
        }
      },
    };
  }

  private async loadManifest(manifestPath: string): Promise<PluginManifest> {
    const require = createRequire(import.meta.url);
    const manifest = require(manifestPath);
    if (!manifest?.name || !manifest?.version || !manifest?.main) {
      throw new Error('Invalid manifest: name, version, and main are required');
    }
    return manifest as PluginManifest;
  }

  private validateManifest(manifest: PluginManifest): void {
    const validTypes = ['tool', 'ui-panel', 'model-provider', 'integration'];
    if (!validTypes.includes(manifest.type)) {
      throw new Error(`Invalid plugin type: ${manifest.type}`);
    }
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('Manifest permissions must be an array');
    }
  }

  getPluginDir(): string {
    return this.pluginDir;
  }

  getRegisteredTools(): Tool[] {
    return [...this.tools];
  }

  getRegisteredProviders(): LLMProvider[] {
    return [...this.providers];
  }
}
