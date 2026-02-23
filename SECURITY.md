# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Kado, **please do not open a public issue.**

Instead, report it privately by emailing **security@kado-autonomy.dev** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (optional)

We will acknowledge your report within **48 hours** and aim to provide a resolution or mitigation plan within **7 days**.

## What to Expect

1. **Acknowledgement** - We will confirm receipt of your report within 48 hours.
2. **Assessment** - We will investigate and determine the severity and scope.
3. **Resolution** - We will develop and test a fix privately.
4. **Disclosure** - Once a fix is released, we will publish a security advisory crediting the reporter (unless you prefer to remain anonymous).

## Scope

This policy applies to the Kado application and all packages in this repository:

- `@kado/desktop`
- `@kado/renderer`
- `@kado/orchestrator`
- `@kado/ai-engine`
- `@kado/shared`

## Credential Handling

Kado stores API keys (OpenAI, Anthropic, etc.) using AES-256-GCM encryption in `~/.kado/credentials/`. Keys are derived from machine identity and never transmitted or stored in plaintext. If you believe there is a flaw in this mechanism, please report it following the process above.

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials to the repository.
- Use environment variables or the encrypted credential store for sensitive values.
- Validate and sanitize all user input, especially in tool execution and shell commands.
- Follow the principle of least privilege when adding new permissions or capabilities.
