# Kado v2 — Autonomous Coding Agent

[![CI](https://github.com/kado-autonomy/kado/actions/workflows/ci.yml/badge.svg)](https://github.com/kado-autonomy/kado/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/kado-autonomy/kado)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Kado v2 is a desktop application that acts as an autonomous coding agent. Describe what you want to build, and it helps you write code, run commands, and navigate your project through natural conversation.

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite, lucide-react
- **Desktop**: Electron (via `@kado/desktop`)
- **AI**: OpenAI, Anthropic, Ollama (via `@kado/ai-engine`)
- **Monorepo**: pnpm workspaces

## Monorepo Structure

```
kado-v2/
├── packages/
│   ├── desktop/      # Electron main process, app shell
│   ├── renderer/      # React UI (Vite)
│   ├── orchestrator/  # Agent orchestration logic
│   ├── ai-engine/     # LLM integrations
│   └── shared/        # Shared types and utilities
├── tools/             # Build/dev tooling
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Runs the full desktop app. For renderer-only development:

```bash
pnpm dev:renderer
```

### Build

```bash
pnpm build
```

## Architecture

The app is split into packages: the **desktop** package hosts the Electron main process and loads the **renderer** (React UI). The **orchestrator** coordinates agent workflows and subagents, while the **ai-engine** handles LLM API calls. The **renderer** uses design tokens (CSS custom properties) for theming and Tailwind utility classes for layout and styling.

## License

MIT
