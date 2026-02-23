# User Guide

Kado v2 is a desktop coding agent. You describe what you want to build in natural language, and the agent writes code, runs commands, and navigates your project autonomously.

## First Launch

On first launch the onboarding wizard walks you through:

1. **Welcome** — Overview of what Kado can do.
2. **Project selection** — Pick a folder to open.
3. **API keys** — Enter keys for OpenAI, Anthropic, or configure a local Ollama URL.
4. **Tips** — Quick-start guidance.

You can re-run onboarding or change any setting later from the Settings panel.

## Application Layout

The interface is split into three resizable regions:

```
┌──────────┬──────────────────────────┐
│          │                          │
│ Sidebar  │      Main Area           │
│          │  (Editor / Chat / Diff)  │
│          │                          │
│          ├──────────────────────────┤
│          │    Bottom Panel          │
│          │  (Console / Subagents)   │
└──────────┴──────────────────────────┘
```

## File Explorer

The left sidebar contains a tree-view file explorer.

- **Expand / collapse** — Click folder names to toggle.
- **Open files** — Click a file to open it in the editor.
- **Context menu** — Right-click any file or folder for actions:
  - New File / New Folder
  - Rename
  - Delete
- **Fuzzy search** — Press `Cmd+P` (macOS) or `Ctrl+P` to open the fuzzy file finder. Start typing a filename and select from the filtered results.

## Code Editor

The main area hosts a Monaco-based code editor.

- **Multi-tab** — Open multiple files simultaneously. Tabs appear in the tab bar above the editor.
- **Syntax highlighting** — Automatic language detection.
- **Diff view** — When the agent proposes changes a side-by-side diff viewer appears showing additions and deletions with hunk-level accept/reject controls.

## Chat Panel

The chat panel is where you interact with the agent.

- **Send messages** — Type a prompt describing what you want and press Enter.
- **Streaming responses** — The agent's reply streams in real-time with markdown rendering (code blocks, lists, headings).
- **Clarifying questions** — If the agent needs more information it presents structured questions with selectable options.
- **Tool invocations** — As the agent works you can see which tools it calls (file reads, shell commands, searches) inline in the conversation.

## Subagent Viewer

For complex tasks the orchestrator spawns specialist subagents (code review, refactoring, test writing, research, documentation). The subagent viewer shows:

- **Subagent cards** — One card per active subagent showing its type, current status, and progress.
- **Message flow** — A timeline of TOON protocol messages exchanged between the orchestrator and each subagent.

## Results Console

The bottom panel displays output from agent actions.

- **Terminal output** — stdout and stderr from shell commands.
- **Test results** — Passed / failed / total counts from test runs.
- **Lint results** — Error and warning counts from ESLint or Ruff.
- **Filtering** — Use the filter bar to show only errors, warnings, or specific output types.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B` / `Ctrl+B` | Toggle sidebar |
| `Cmd+J` / `Ctrl+J` | Toggle bottom panel |
| `Cmd+P` / `Ctrl+P` | Fuzzy file search |
| `Cmd+S` / `Ctrl+S` | Save current file |
| `Cmd+Shift+P` / `Ctrl+Shift+P` | Command palette |

Shortcuts are customisable in Settings > Shortcuts.

## Settings

Open Settings from the toolbar or sidebar gear icon. The settings panel has four tabs:

### General

- **Project path** — Active project directory.
- **Max token budget** — Upper limit on tokens per agent request (default: 100,000).
- **Max subagents** — Maximum concurrent subagents (default: 4).
- **Auto save** — Automatically save files after agent edits.
- **Default model** — LLM used for the primary agent loop (default: `gpt-4o`).

### AI Models

- **OpenAI API key** — For GPT models.
- **Anthropic API key** — For Claude models.
- **Ollama URL** — Base URL for local Ollama instance.
- **Model preference order** — Drag to reorder which models are tried first.

### Theme

- **Light / Dark / System** — Colour scheme selection.
- Design tokens (CSS custom properties) control all colours, making it easy to create custom themes.

### Shortcuts

- View and rebind all keyboard shortcuts.

## Diff Review

When the agent proposes file changes:

1. A diff summary appears listing affected files with insertion/deletion counts.
2. Click a file to see the side-by-side diff.
3. Use hunk controls to accept or reject individual changes.
4. Accepted changes are written to disk automatically.

## Tips

- Be specific in your prompts — "Add a login page with email/password fields and validation" works better than "add auth".
- The agent can run tests and lint after making changes — ask it to verify its work.
- Use the subagent viewer to monitor progress on large tasks.
- Check the console for any errors in shell commands or test runs.
