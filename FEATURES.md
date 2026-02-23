# Features and potential improvements

Overview of what **Pax** does today and ideas for issues or contributions. You can turn any “Potential issue / idea” into a GitHub issue and reference this file.

---

## Current features

### Core

- **Daily logs in Notion** – Upsert today’s log; fields: score, mood, energy, deep work hours, workout, diet, reading, went well, improve, gratitude, tomorrow.
- **TODOs in Notion** – List, add, complete; categories (Work, Health, Personal, Learning), priority (High/Medium/Low), status (Todo, In Progress, Done).
- **Pax agent** – Chat with an AI that can read/update logs and tasks via tools; behaviour defined in `agent-context/` (rules, docs). Long conversations: last N messages sent in full; older turns summarized and cached per session (incremental summary cache in `agent-use-case.ts`) to avoid repeated LLM summarization.
- **Partial updates** – Preserve existing log/task data; update only the fields the user or agent provides.

### Interfaces

- **CLI** – `journal` with subcommands: `log`, `todos list|add|complete`, `today`, `agent`.
- **TUI** – Terminal UI (OpenTUI): welcome, tips, recent activity, Pax chat. First-run setup for OpenAI + Notion + column mapping. **Ctrl+P** for Profile & Settings.
- **Optional HTTP UI** – `bun run ui` for local API (e.g. GET /today, POST /log, GET /todos).

### Config and data

- **Config** – `~/.pa/` (or `$XDG_CONFIG_HOME/pa`): `profile.json`, `settings.json`. Env vars override file values.
- **Column mapping** – Notion property names configurable via env or settings; first-run TUI can scan DBs and confirm mappings. `bun run ping` / `bun run test:notion-mapping` to validate.
- **Scheduling** – README describes cron/launchd for `bun run daily` (e.g. morning reminder).

---

## Potential issues / ideas

Use these as a starting point for GitHub issues or PRs. Labels like “good first issue” or “help wanted” can be added in the issue tracker.

### TUI

- [ ] **TUI scroll / small terminals** – Improve behaviour when the terminal is short or when content overflows (see `tests/tui-activity-scroll.test.mjs`).
- [ ] **Keyboard shortcuts** – Document and/or extend shortcuts (e.g. navigation, refresh).
- [ ] **Accessibility** – Screen reader support, focus order, high-contrast or theme options.
- [ ] **Offline / degraded mode** – Clear message when Notion is unreachable; optionally cache last state.

### Agent (Pax)

- [ ] **Tool clarity** – More precise tool names/schemas or examples so the model chooses the right tool more often.
- [ ] **Streaming** – Stream agent replies in TUI for a more responsive feel.
- [ ] **Model choice** – Support for other providers or models (e.g. configurable endpoint).
- [ ] **Cost / token usage** – Optional logging or display of token usage per session.

### Notion

- [ ] **Schema validation** – Clear errors when required properties are missing or wrong type in the Notion DB.
- [ ] **More property types** – Support for relations, rollups, or formula if needed for logs/tasks.
- [ ] **Rate limiting** – Respect Notion rate limits with backoff or queue.

### CLI and UX

- [ ] **`journal today` output** – Formatting, optional JSON or markdown for scripting.
- [ ] **Export** – Export logs or tasks (e.g. CSV, JSON) for backup or analysis.
- [ ] **Idempotent `log`** – Clear semantics for “update today’s log” vs “create if missing”.

### Config and setup

- [ ] **Multiple profiles** – e.g. work vs personal Notion workspaces.
- [ ] **Secret handling** – Avoid printing API keys in errors; use `maskSecret` consistently.
- [ ] **Docs** – Short video or GIF for first-run TUI; link from README.

### Code and quality

- [ ] **Tests** – More unit tests for use-cases and parsers (e.g. agent tool parsing); integration tests for Notion adapters where feasible.
- [ ] **CI** – Typecheck and tests on push/PR (e.g. GitHub Actions).
- [ ] **Logging** – Structured logging (e.g. levels, request IDs) for debugging in production.

---

## How to use this list

- **Open an issue:** Pick an item (or propose a new one), open a new issue and use the [feature request](.github/ISSUE_TEMPLATE/feature_request.md) or [bug report](.github/ISSUE_TEMPLATE/bug_report.md) template. Mention “From FEATURES.md” and the bullet line.
- **Contribute:** See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and conventions. If you implement something from this list, link the issue in your PR.
