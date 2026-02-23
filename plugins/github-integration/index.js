/**
 * GitHub Integration Plugin
 *
 * Registers tools for interacting with GitHub: creating issues,
 * listing issues, and creating pull requests.
 */

async function activate(api) {
  const token = api.getConfig("githubToken") ?? "";
  const owner = api.getConfig("owner") ?? "";
  const repo = api.getConfig("repo") ?? "";

  function headers() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  function apiUrl(path) {
    return `https://api.github.com/repos/${owner}/${repo}${path}`;
  }

  api.registerTool({
    name: "createIssue",
    description: "Create a new GitHub issue in the configured repository",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue body (Markdown)" },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to apply",
        },
      },
      required: ["title"],
    },
    async execute({ title, body, labels }) {
      const response = await fetch(apiUrl("/issues"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ title, body, labels }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${err}`);
      }
      const issue = await response.json();
      return {
        number: issue.number,
        url: issue.html_url,
        title: issue.title,
      };
    },
  });

  api.registerTool({
    name: "listIssues",
    description:
      "List open issues in the configured GitHub repository",
    parameters: {
      type: "object",
      properties: {
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "Filter by issue state",
        },
        labels: {
          type: "string",
          description: "Comma-separated label names to filter by",
        },
        limit: {
          type: "number",
          description: "Max issues to return (default 30)",
        },
      },
    },
    async execute({ state, labels, limit } = {}) {
      const params = new URLSearchParams();
      params.set("state", state ?? "open");
      params.set("per_page", String(limit ?? 30));
      if (labels) params.set("labels", labels);

      const response = await fetch(
        `${apiUrl("/issues")}?${params.toString()}`,
        { headers: headers() }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${err}`);
      }
      const issues = await response.json();
      return issues.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
        labels: i.labels.map((l) => l.name),
      }));
    },
  });

  api.registerTool({
    name: "createPR",
    description:
      "Create a pull request in the configured GitHub repository",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "PR title" },
        body: { type: "string", description: "PR description (Markdown)" },
        head: {
          type: "string",
          description: "Branch containing changes",
        },
        base: {
          type: "string",
          description: "Branch to merge into (default: main)",
        },
        draft: {
          type: "boolean",
          description: "Create as draft PR",
        },
      },
      required: ["title", "head"],
    },
    async execute({ title, body, head, base, draft }) {
      const response = await fetch(apiUrl("/pulls"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title,
          body,
          head,
          base: base ?? "main",
          draft: draft ?? false,
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GitHub API error ${response.status}: ${err}`);
      }
      const pr = await response.json();
      return {
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        state: pr.state,
      };
    },
  });
}

async function deactivate() {}

module.exports = { activate, deactivate };
