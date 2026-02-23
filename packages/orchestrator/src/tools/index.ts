export * from './types.js';
export { ToolRegistry } from './registry.js';
export { FileReadTool } from './file-read.js';
export { FileWriteTool } from './file-write.js';
export { FileEditTool } from './file-edit.js';
export { GlobSearchTool } from './glob-search.js';
export { GrepSearchTool } from './grep-search.js';
export { ShellExecuteTool } from './shell-execute.js';
export { TestRunnerTool } from './test-runner.js';
export { LintTool } from './lint.js';
export { SemanticSearchTool } from './semantic-search.js';
export { WebSearchTool } from './web-search.js';

import { ToolRegistry } from './registry.js';
import { FileReadTool } from './file-read.js';
import { FileWriteTool } from './file-write.js';
import { FileEditTool } from './file-edit.js';
import { GlobSearchTool } from './glob-search.js';
import { GrepSearchTool } from './grep-search.js';
import { ShellExecuteTool } from './shell-execute.js';
import { TestRunnerTool } from './test-runner.js';
import { LintTool } from './lint.js';
import { SemanticSearchTool } from './semantic-search.js';
import { WebSearchTool } from './web-search.js';

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(FileReadTool);
  registry.register(FileWriteTool);
  registry.register(FileEditTool);
  registry.register(GlobSearchTool);
  registry.register(GrepSearchTool);
  registry.register(ShellExecuteTool);
  registry.register(TestRunnerTool);
  registry.register(LintTool);
  registry.register(SemanticSearchTool);
  registry.register(WebSearchTool);

  // Common LLM-hallucinated tool name aliases
  registry.registerAlias('read', 'file_read');
  registry.registerAlias('read_file', 'file_read');
  registry.registerAlias('write', 'file_write');
  registry.registerAlias('write_file', 'file_write');
  registry.registerAlias('edit', 'file_edit');
  registry.registerAlias('code_edit', 'file_edit');
  registry.registerAlias('search', 'grep_search');
  registry.registerAlias('code_search', 'grep_search');
  registry.registerAlias('codebase_search', 'semantic_search');
  registry.registerAlias('run', 'shell_execute');
  registry.registerAlias('exec', 'shell_execute');
  registry.registerAlias('local_run', 'shell_execute');
  registry.registerAlias('terminal', 'shell_execute');
  registry.registerAlias('git', 'shell_execute');
  registry.registerAlias('find_files', 'glob_search');

  return registry;
}
