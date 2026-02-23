# Contributing to Kado v2

Thank you for your interest in contributing! This guide covers the development workflow, code standards, and pull request process.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
pnpm install
```

3. Set up the Python environment for `ai-engine`:

```bash
cd packages/ai-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

4. Start the dev server:

```bash
pnpm dev
```

See [Getting Started](docs/getting-started.md) for full setup instructions.

## Code Style

### TypeScript

- Strict mode enabled (`tsconfig.base.json` extends into each package).
- ESLint with the config at `eslint.config.js` — run `pnpm lint` to check.
- Prettier for formatting (`.prettierrc` at the root).
- Prefer `const` over `let`. Avoid `any` — use `unknown` with type narrowing.
- Use explicit return types on exported functions.

### Python

- Python 3.11+.
- Type hints on all function signatures.
- Pydantic models for request/response schemas.
- Ruff for linting and formatting.

### General

- EditorConfig (`.editorconfig`) enforces consistent indentation (2 spaces for TS, 4 for Python) and trailing-newline rules.

## Testing

### TypeScript (Vitest)

```bash
pnpm test                              # all packages
pnpm --filter @kado/orchestrator test  # single package
```

Tests live alongside source code in `__tests__/` directories.

### Python (pytest)

```bash
cd packages/ai-engine
source venv/bin/activate
python -m pytest -v
```

Tests are in the `tests/` directory.

### Writing Tests

- Every new feature or bug fix should include tests.
- Use descriptive test names that explain the expected behaviour.
- Mock external services (LLM APIs, file system) rather than making real calls.

## Pull Request Process

1. **Branch** — Create a feature branch from `main`:

```bash
git checkout -b feat/my-feature
```

2. **Implement** — Make your changes. Keep commits focused and atomic.

3. **Test** — Run the full test suite and ensure it passes:

```bash
pnpm test && pnpm lint && pnpm typecheck
```

4. **Commit** — Write clear commit messages. Use conventional commit prefixes:
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `refactor:` — Code restructuring
   - `docs:` — Documentation
   - `test:` — Adding or updating tests
   - `chore:` — Tooling, deps, CI

5. **Push & open PR** — Push your branch and open a pull request against `main`.
   - Fill in the PR template with a summary and test plan.
   - Link any related issues.

6. **Review** — Address reviewer feedback. All PRs require at least one approval before merge.

## Architecture Overview

For a detailed description of how the packages fit together, see [Architecture](docs/architecture.md).

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests.
- Include reproduction steps, expected vs. actual behaviour, and relevant logs.
- For security issues, email the maintainers directly — do not open a public issue.
