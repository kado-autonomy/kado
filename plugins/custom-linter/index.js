/**
 * Custom Linter Plugin
 *
 * Registers a customLint tool that runs configurable lint rules
 * against file contents and returns diagnostics.
 */

const DEFAULT_RULES = [
  {
    id: "no-console-log",
    pattern: /\bconsole\.log\b/g,
    message: "Avoid console.log in production code",
    severity: "warning",
  },
  {
    id: "no-todo-comments",
    pattern: /\/\/\s*TODO\b/gi,
    message: "Unresolved TODO comment",
    severity: "info",
  },
  {
    id: "no-debugger",
    pattern: /\bdebugger\b/g,
    message: "Remove debugger statement",
    severity: "error",
  },
  {
    id: "no-var",
    pattern: /\bvar\s+\w/g,
    message: "Use let or const instead of var",
    severity: "warning",
  },
  {
    id: "max-line-length",
    pattern: null,
    check(line) {
      return line.length > 120;
    },
    message: "Line exceeds 120 characters",
    severity: "info",
  },
];

function lintContent(content, filePath, rules) {
  const lines = content.split("\n");
  const diagnostics = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    for (const rule of rules) {
      if (rule.pattern) {
        rule.pattern.lastIndex = 0;
        let match;
        while ((match = rule.pattern.exec(line)) !== null) {
          diagnostics.push({
            file: filePath,
            line: lineIdx + 1,
            column: match.index + 1,
            rule: rule.id,
            severity: rule.severity,
            message: rule.message,
          });
        }
      } else if (rule.check && rule.check(line, lineIdx, lines)) {
        diagnostics.push({
          file: filePath,
          line: lineIdx + 1,
          column: 1,
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
        });
      }
    }
  }

  return diagnostics;
}

async function activate(api) {
  const extraRules = api.getConfig("rules") ?? [];

  const allRules = [...DEFAULT_RULES];
  for (const custom of extraRules) {
    if (custom.pattern) {
      allRules.push({
        ...custom,
        pattern: new RegExp(custom.pattern, custom.flags ?? "g"),
      });
    }
  }

  api.registerTool({
    name: "customLint",
    description:
      "Run custom lint rules against one or more files and return diagnostics",
    parameters: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "File content" },
            },
            required: ["path", "content"],
          },
          description: "Files to lint",
        },
        enabledRules: {
          type: "array",
          items: { type: "string" },
          description:
            "Subset of rule IDs to run (omit to run all rules)",
        },
      },
      required: ["files"],
    },
    async execute({ files, enabledRules }) {
      const ruleset = enabledRules
        ? allRules.filter((r) => enabledRules.includes(r.id))
        : allRules;

      const allDiagnostics = [];
      for (const file of files) {
        const fileDiags = lintContent(file.content, file.path, ruleset);
        allDiagnostics.push(...fileDiags);
      }

      return {
        totalFiles: files.length,
        totalDiagnostics: allDiagnostics.length,
        diagnostics: allDiagnostics,
        summary: {
          errors: allDiagnostics.filter((d) => d.severity === "error").length,
          warnings: allDiagnostics.filter((d) => d.severity === "warning").length,
          info: allDiagnostics.filter((d) => d.severity === "info").length,
        },
      };
    },
  });
}

async function deactivate() {}

module.exports = { activate, deactivate };
