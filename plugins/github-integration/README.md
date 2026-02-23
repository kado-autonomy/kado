# GitHub Integration Plugin

Interact with GitHub repositories directly from Kado — create issues, list issues, and open pull requests.

## Tools

| Tool | Description |
|------|-------------|
| `createIssue` | Create a new issue with title, body, and labels |
| `listIssues` | List issues filtered by state and labels |
| `createPR` | Open a pull request from a branch |

## Configuration

| Key | Description | Required |
|-----|-------------|----------|
| `githubToken` | GitHub personal access token (with `repo` scope) | Yes |
| `owner` | Repository owner (user or org) | Yes |
| `repo` | Repository name | Yes |

### Example

```json
{
  "githubToken": "ghp_xxxxxxxxxxxx",
  "owner": "your-username",
  "repo": "your-repo"
}
```

## Installation

1. In Kado, go to **Settings → Plugins**
2. Click **Install from directory**
3. Select this plugin's folder
4. Configure your GitHub token and repository details
