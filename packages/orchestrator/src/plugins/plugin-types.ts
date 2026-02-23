import type { Tool } from '../tools/types.js';
import type { LLMProvider } from '../llm/provider.js';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string;
  type: 'tool' | 'ui-panel' | 'model-provider' | 'integration';
  permissions: string[];
}

export interface PluginAPI {
  registerTool(tool: Tool): void;
  registerModelProvider(provider: LLMProvider): void;
  getConfig<T = unknown>(key: string): T | undefined;
  setConfig(key: string, value: unknown): void;
}

export interface PluginLifecycle {
  activate(api: PluginAPI): Promise<void>;
  deactivate(): Promise<void>;
}

export type PluginStatus = 'installed' | 'active' | 'inactive' | 'error';

export interface PluginInfo {
  manifest: PluginManifest;
  status: PluginStatus;
  error?: string;
}
