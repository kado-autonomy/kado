# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 (Unreleased)

### Added

- Electron desktop shell with IPC bridge for file system, shell, dialog, settings, and credential management.
- React renderer with resizable three-panel layout (sidebar, main, bottom).
- File Explorer with tree view, context menu, and fuzzy file search.
- Monaco-based code editor with multi-tab support.
- Inline diff viewer with hunk-level accept/reject controls.
- Chat panel with streaming responses, markdown rendering, and clarifying questions.
- Subagent viewer with status cards and TOON message flow timeline.
- Results console with filtered output for shell, test, and lint results.
- Settings panel: General, AI Models, Theme, Shortcuts.
- First-run onboarding wizard (welcome, project selection, API keys, tips).
- Agentic orchestrator with state machine, event bus, and task queue.
- Planner/executor for decomposing goals into executable steps.
- Tool registry with 10 built-in tools: FileRead, FileWrite, FileEdit, GlobSearch, GrepSearch, ShellExecute, TestRunner, Lint, SemanticSearch, WebSearch.
- LLM provider abstraction for OpenAI, Anthropic, and Ollama with model selector.
- Subagent manager with specialist agents: code-review, refactor, test-writer, research, documentation.
- Memory layer: conversation store, context pool, context window, knowledge base, vector bridge.
- TOON binary protocol for inter-agent communication (18-byte header, RLE compression).
- Plugin system with manifest, sandboxed execution, and permission management.
- Permission manager with audit logging and rollback support.
- Sandbox with command filter and network guard.
- Python FastAPI ai-engine with sentence-transformer embeddings and FAISS vector store.
- RL service for action logging, feedback, statistics, and optimisation.
- AES-256-GCM encrypted credential storage derived from machine identity.
- Shared package with cross-package types, TOON codec, and constants.
- pnpm workspace monorepo with Turborepo-compatible scripts.
- ESLint, Prettier, EditorConfig, and Ruff for code quality.
- Vitest for TypeScript tests, pytest for Python tests.
