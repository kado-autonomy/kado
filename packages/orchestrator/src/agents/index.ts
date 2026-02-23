export { SubagentManager } from './subagent-manager.js';
export type { SubagentManagerEvents } from './subagent-manager.js';
export { Subagent } from './subagent.js';
export type {
  SubagentOptions,
  ContextPool,
  SubagentLLMProvider,
  SubagentToolRegistry,
} from './subagent.js';
export type {
  AgentType,
  SubagentConfig,
  SubagentInfo,
  SubagentStatus,
  SubagentResult,
  ReviewIssue,
  ReviewResult,
  TestGenerationResult,
  DocResult,
  RefactorResult,
  ResearchResult,
} from './types.js';
export { CodeReviewAgent } from './specialists/code-review-agent.js';
export { TestWriterAgent } from './specialists/test-writer-agent.js';
export { DocumentationAgent } from './specialists/documentation-agent.js';
export { RefactorAgent } from './specialists/refactor-agent.js';
export { ResearchAgent } from './specialists/research-agent.js';
