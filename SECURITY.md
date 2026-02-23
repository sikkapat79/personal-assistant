# Security policy

## Supported versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a vulnerability

If you believe you've found a security vulnerability, please report it responsibly:

1. **Do not** open a public issue.
2. Open a **private security advisory**: in this repo go to the **Security** tab → **Advisories** → **New draft advisory**. Alternatively, contact the maintainers (e.g. as in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)).
3. Include a clear description, steps to reproduce, and impact if possible.
4. We will acknowledge and respond as soon as we can. We may ask for more detail or work with you on a fix before disclosure.

We do not have a bug bounty program; we appreciate responsible disclosure and will credit you in the advisory if you wish.

## Data and secrets

- **Pax** stores Notion and optional OpenAI API keys in `~/.pa/settings.json` or environment variables. These are never logged or sent anywhere except to Notion/OpenAI APIs.
- Do not commit `.env`, `~/.pa/settings.json`, or any file containing API keys or tokens. The repository should not contain real credentials.

## HTTP UI (bun run ui)

The optional HTTP UI is intended for **localhost only**. It has no authentication. Do not expose it to the network (e.g. by binding to 0.0.0.0 or via port forwarding) without adding authentication.
