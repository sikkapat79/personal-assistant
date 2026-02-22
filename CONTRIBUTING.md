# Contributing to Pax

Thanks for considering contributing to **Pax** (self-discipline daily journal). This guide explains how to set up the project and what we expect from contributions. By participating, you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- **Bun** ≥ 1.0 (`engines` in `package.json`)
- A Notion workspace with two databases (Logs + TODOs) for full testing; see [README.md](README.md#setup-manual)

## Development setup

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd Pax
   bun install
   ```

2. Configure Notion (optional for typecheck/lint; required for `ping` and agent):
   - Copy `.env.example` to `.env` and set `NOTION_API_KEY`, `NOTION_LOGS_DATABASE_ID`, `NOTION_TODOS_DATABASE_ID`
   - Or use first-run wizard: `bun run tui` and follow prompts (settings saved to `~/.pa/settings.json`)

3. Verify:
   ```bash
   bun run typecheck
   bun run ping          # if Notion is configured
   bun run journal       # or bun run tui
   ```

## Code conventions

- **One function, class, or component per file.** One main export per `.ts`/`.tsx` file; thin entry points. See [.cursor/rules/one-function-per-file.mdc](.cursor/rules/one-function-per-file.mdc).
- **KISS, DRY & SOLID.** Prefer the simplest solution; no duplicate logic; depend on ports (interfaces), not concrete adapters. See [.cursor/rules/design-principles.mdc](.cursor/rules/design-principles.mdc).
- **TypeScript only.** No build step for running; use plain TS imports (no `.js` extensions). Run with Bun.
- **Structure:** Domain in `domain/`, ports in `application/ports/`, use-cases in `application/use-cases/`, adapters in `adapters/`. See [AGENTS.md](AGENTS.md) for a short map.

Agent behaviour (log/task rules, prompts) lives in **agent-context/**; change behaviour there when possible instead of hardcoding in use-cases.

## Submitting changes

1. **Open an issue first** for non-trivial changes (feature or bug). Use the [feature request](.github/ISSUE_TEMPLATE/feature_request.md) or [bug report](.github/ISSUE_TEMPLATE/bug_report.md) template when relevant.
2. **Branch** from `main` (or the current default branch). Use a short, descriptive branch name (e.g. `fix/tui-scroll`, `feat/export-logs`).
3. **Implement** following the conventions above. Add or update tests if the project has tests for the area you touch.
4. **Run** `bun run typecheck` (and `bun run ping` if you changed Notion/config).
5. **Commit** with clear messages (e.g. "fix: TUI scroll on small terminals", "feat: add CSV export for logs").
6. **Push** and open a **pull request**. Describe what changed and why; link the issue if one exists.

We’re a small project; we’ll review as we can and may ask for small edits.

## Areas where help is welcome

- **TUI:** Accessibility, keyboard shortcuts, layout on different terminal sizes.
- **Agent (Pax):** Improving prompts or rules in `agent-context/`, or tool behaviour in the agent use-case.
- **Notion:** Supporting more property types or column mappings, or clearer errors when mapping fails.
- **Docs:** README, CONTRIBUTING, or comments for complex logic.
- **Tests:** Broader coverage for use-cases and adapters (see `tests/` and `bun run test:*` scripts).

See [FEATURES.md](FEATURES.md) for a list of current features and possible improvements (good candidates for issues or PRs).

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).
