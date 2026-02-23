# Custom Linter Plugin

Run custom lint rules against project files to catch common issues and enforce coding standards.

## Built-in Rules

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `no-console-log` | warning | Flags `console.log` statements |
| `no-todo-comments` | info | Flags unresolved TODO comments |
| `no-debugger` | error | Flags `debugger` statements |
| `no-var` | warning | Flags `var` declarations (prefer `let`/`const`) |
| `max-line-length` | info | Flags lines exceeding 120 characters |

## Tool: `customLint`

**Parameters:**

- `files` (required) — Array of `{ path, content }` objects to lint
- `enabledRules` (optional) — Array of rule IDs to run; omit to run all

**Returns:**

```json
{
  "totalFiles": 2,
  "totalDiagnostics": 5,
  "diagnostics": [
    {
      "file": "src/index.ts",
      "line": 12,
      "column": 5,
      "rule": "no-console-log",
      "severity": "warning",
      "message": "Avoid console.log in production code"
    }
  ],
  "summary": { "errors": 0, "warnings": 3, "info": 2 }
}
```

## Custom Rules

Add custom regex-based rules through plugin configuration:

```json
{
  "rules": [
    {
      "id": "no-magic-numbers",
      "pattern": "(?<![\\w.])\\d{2,}(?![\\w.])",
      "flags": "g",
      "message": "Avoid magic numbers — use named constants",
      "severity": "warning"
    }
  ]
}
```

## Installation

1. In Kado, go to **Settings → Plugins**
2. Click **Install from directory**
3. Select this plugin's folder
