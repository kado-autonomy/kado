# Getting Started

## Prerequisites

| Dependency | Version   | Notes                     |
| ---------- | --------- | ------------------------- |
| Node.js    | >= 20.0.0 | LTS recommended           |
| pnpm       | >= 9.0.0  | Workspace package manager |
| Python     | >= 3.11   | For the ai-engine package |
| Git        | any       | Source control            |

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/kado-autonomy/kado.git
cd kado
```

### 2. Install Node.js dependencies

```bash
pnpm install
```

This installs dependencies for all workspace packages (`desktop`, `renderer`, `orchestrator`, `shared`).

### 3. Set up the Python environment

```bash
cd packages/ai-engine
python -m venv venv
source venv/bin/activate   # macOS / Linux
# venv\Scripts\activate    # Windows
pip install -r requirements.txt
cd ../..
```

### 4. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp packages/ai-engine/.env.example packages/ai-engine/.env
```

Default `.env` values:

```env
HOST=0.0.0.0
PORT=8100
DEBUG=false
EMBEDDING_MODEL=all-MiniLM-L6-v2
VECTOR_DIMENSIONS=384
FAISS_INDEX_PATH=./data/faiss_index
LOG_LEVEL=INFO
```

### 5. Configure API keys

API keys for LLM providers (OpenAI, Anthropic) can be set in two ways:

- **Onboarding wizard** — On first launch the app walks you through API key entry.
- **Settings panel** — Open Settings > AI Models to add or update keys at any time.

Keys are encrypted with AES-256-GCM and stored in `~/.kado/credentials/`.

## Running in Development

### Full application (Electron + Renderer)

```bash
pnpm dev
```

This starts the Electron main process which loads the Vite dev server for the renderer.

### Individual packages

```bash
# Renderer only (Vite dev server at http://localhost:5173)
pnpm dev:renderer

# Orchestrator only (watch mode)
pnpm dev:orchestrator

# AI Engine only (Uvicorn at http://localhost:8100)
pnpm dev:ai-engine
```

## Building for Production

```bash
# Build all packages
pnpm build

# Build only the desktop distributable
pnpm build:desktop
```

The desktop build uses `electron-builder` (configured in `packages/desktop/electron-builder.yml`).

## Running Tests

```bash
# All packages
pnpm test

# TypeScript packages (Vitest)
pnpm --filter @kado/orchestrator test
pnpm --filter @kado/shared test

# Python ai-engine (pytest)
cd packages/ai-engine
source venv/bin/activate
python -m pytest -v
```

## Linting & Type Checking

```bash
# Lint everything
pnpm lint

# Type-check everything
pnpm typecheck
```

## Project Structure Quick Reference

```
kado-v2/
├── packages/
│   ├── desktop/         # Electron main process
│   ├── renderer/        # React UI (Vite)
│   ├── orchestrator/    # Agent orchestration
│   ├── ai-engine/       # Python FastAPI service
│   └── shared/          # Shared types & utilities
├── tools/               # Build tooling
├── docs/                # Documentation
├── eslint.config.js     # ESLint config
├── tsconfig.base.json   # Shared TS config
└── package.json         # Root workspace
```

## Next Steps

- Read the [User Guide](user-guide.md) to learn how to use the app.
- See the [Architecture](architecture.md) for a deep dive into the system design.
- Check [Configuration](configuration.md) for all available settings.
