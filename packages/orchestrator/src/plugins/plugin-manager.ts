import { createRequire } from 'node:module';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { PluginManifest, PluginInfo, PluginStatus } from './plugin-types.js';
import { PluginSandbox } from './plugin-sandbox.js';
import type { OrchestratorRef } from './plugin-sandbox.js';

export class PluginManager {
  private pluginsPath: string;
  private orchestrator: OrchestratorRef;
  private plugins: Map<string, PluginInfo & { sandbox?: PluginSandbox; lifecycle?: { deactivate(): Promise<void> } }> =
    new Map();

  constructor(pluginsPath: string, orchestrator: OrchestratorRef) {
    this.pluginsPath = pluginsPath;
    this.orchestrator = orchestrator;
  }

  async loadPlugin(manifestPath: string): Promise<void> {
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest not found: ${manifestPath}`);
    }

    const pluginDir = manifestPath.replace(/[\\/]package\.json$/, '').replace(/[\\/]plugin\.json$/, '');
    const sandbox = new PluginSandbox(pluginDir, this.orchestrator);

    try {
      const lifecycle = await sandbox.loadAndActivate(manifestPath);
      const manifest = await this.getManifestFromPath(manifestPath);
      this.plugins.set(manifest.name, {
        manifest,
        status: 'active',
        sandbox,
        lifecycle: { deactivate: lifecycle.deactivate },
      });
    } catch (err) {
      const manifest = await this.getManifestFromPath(manifestPath).catch(() => null);
      const name = manifest?.name ?? 'unknown';
      this.plugins.set(name, {
        manifest: manifest ?? ({} as PluginManifest),
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private async getManifestFromPath(manifestPath: string): Promise<PluginManifest> {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    return require(manifestPath) as PluginManifest;
  }

  async activatePlugin(name: string): Promise<void> {
    const info = this.plugins.get(name);
    if (!info) {
      throw new Error(`Plugin not found: ${name}`);
    }
    if (info.status === 'active') return;

    const manifestPath = this.findManifestPath(name);
    if (!manifestPath) {
      throw new Error(`Manifest not found for plugin: ${name}`);
    }

    const pluginDir = manifestPath.replace(/[\\/]package\.json$/, '').replace(/[\\/]plugin\.json$/, '');
    const sandbox = new PluginSandbox(pluginDir, this.orchestrator);
    const lifecycle = await sandbox.loadAndActivate(manifestPath);

    this.plugins.set(name, {
      ...info,
      status: 'active',
      error: undefined,
      sandbox,
      lifecycle: { deactivate: lifecycle.deactivate },
    });
  }

  async deactivatePlugin(name: string): Promise<void> {
    const info = this.plugins.get(name);
    if (!info) {
      throw new Error(`Plugin not found: ${name}`);
    }
    if (info.lifecycle) {
      await info.lifecycle.deactivate();
    }
    this.plugins.set(name, {
      manifest: info.manifest,
      status: 'inactive',
      error: info.error,
    });
  }

  async uninstallPlugin(name: string): Promise<void> {
    const info = this.plugins.get(name);
    if (!info) {
      throw new Error(`Plugin not found: ${name}`);
    }
    if (info.status === 'active' && info.lifecycle) {
      await info.lifecycle.deactivate();
    }
    const pluginDir = join(this.pluginsPath, name);
    if (existsSync(pluginDir)) {
      rmSync(pluginDir, { recursive: true });
    }
    this.plugins.delete(name);
  }

  listPlugins(): PluginInfo[] {
    const result: PluginInfo[] = [];
    if (existsSync(this.pluginsPath)) {
      for (const dir of readdirSync(this.pluginsPath, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const manifestPath = join(this.pluginsPath, dir.name, 'package.json');
        const altPath = join(this.pluginsPath, dir.name, 'plugin.json');
        const path = existsSync(manifestPath) ? manifestPath : existsSync(altPath) ? altPath : null;
        if (path) {
          const cached = this.plugins.get(dir.name);
          if (cached) {
            result.push({
              manifest: cached.manifest,
              status: cached.status,
              error: cached.error,
            });
          } else {
            try {
              const require = createRequire(import.meta.url);
              const manifest = require(path) as PluginManifest;
              result.push({
                manifest,
                status: 'installed',
              });
            } catch {
              result.push({
                manifest: { name: dir.name, version: '0.0.0', description: '', main: 'index.js', type: 'tool', permissions: [] },
                status: 'error' as PluginStatus,
                error: 'Failed to load manifest',
              });
            }
          }
        }
      }
    }
    for (const [name, info] of this.plugins) {
      if (!result.some((p) => p.manifest.name === name)) {
        result.push({
          manifest: info.manifest,
          status: info.status,
          error: info.error,
        });
      }
    }
    return result;
  }

  getPlugin(name: string): PluginInfo | undefined {
    const info = this.plugins.get(name);
    if (info) {
      return {
        manifest: info.manifest,
        status: info.status,
        error: info.error,
      };
    }
    const manifestPath = this.findManifestPath(name);
    if (manifestPath) {
      try {
        const require = createRequire(import.meta.url);
        const manifest = require(manifestPath) as PluginManifest;
        return { manifest, status: 'installed' };
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private findManifestPath(name: string): string | null {
    const pluginDir = join(this.pluginsPath, name);
    if (!existsSync(pluginDir)) return null;
    const manifestPath = join(pluginDir, 'package.json');
    const altPath = join(pluginDir, 'plugin.json');
    return existsSync(manifestPath) ? manifestPath : existsSync(altPath) ? altPath : null;
  }
}
