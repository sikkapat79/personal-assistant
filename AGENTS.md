# Agent guide (Pax – self-discipline journal)

Quick reference for AI agents working on this codebase.

## Conventions

- **One function, class, or component per file.** Keep one main export per file; use thin entry points. See `.cursor/rules/one-function-per-file.mdc`.
- **KISS, DRY & SOLID.** Prefer the simplest solution (KISS); avoid duplication (DRY); follow SOLID (e.g. ports in `application/ports/`, composition wires adapters). See `.cursor/rules/design-principles.mdc`.
- **TypeScript/Bun.** No build step for running; imports are plain TS. Use existing paths (e.g. `../../../../config/...` from nested folders under `src/`).

## Structure (src/)

| Area | Purpose |
|------|--------|
| **domain/** | Entities (DailyLog, Todo), value objects. No I/O. |
| **application/ports/** | Interfaces (ILogsRepository, ITodosRepository, etc.). |
| **application/use-cases/** | Log, todos, agent orchestration. |
| **adapters/inbound/cli/** | CLI entry (`index.ts`), interactive prompt, and TUI. |
| **adapters/inbound/cli/tui/** | TUI module: `App.tsx` / `AppRoot.tsx`, hooks, small components, utils, `constants/`, `types.ts`. Entry is `tui-app.tsx` (renderer + mount only). |
| **adapters/outbound/notion/** | Notion API adapters. |
| **config/** | Resolved config, profile, settings (e.g. `~/.pa/settings.json`). |
| **composition/** | Wiring (e.g. `compose()`) for use-cases and adapters. |
| **design-tokens/** | Shared TUI colours etc. |
| **agent-context/** | Editable docs and rules for Pax (log/task behaviour). Not code; edit here to change agent behaviour without code changes. |

## Behaviour and data rules

Log and task behaviour (update modes, preserve data, summarize checklist) is defined in **agent-context/**: see `agent-context/README.md`, `agent-context/rules/data.md`, and `agent-context/docs/journal-and-tasks.md`. Update those files to change how the agent updates logs and tasks.

## Agent chat and session history

Long chat history is handled in **application/use-cases/agent-use-case.ts**: only the last `MAX_RECENT_MESSAGES` (16) messages are sent to the LLM in full; older turns are summarized into a single "Earlier in this session" summary. To avoid re-summarizing on every turn, the use-case uses **incremental caching** on the instance: `lastSummarizedIndex` (length of the prefix already summarized) and `cachedSessionSummary`. When the old-part length has not increased, the cached summary is returned; when it has, only the new slice is summarized and merged with the cache. Cache is invalidated when history is short or shrinks (e.g. after `/clear`). See `buildEffectiveHistory`, `summarizeConversation`, and the cache fields in that file.

## Commands

- `bun run journal` – interactive CLI.
- `bun run tui` – terminal UI (entry: `src/adapters/inbound/cli/tui-app.tsx`).
- `bun run ping` – validate Notion connection and column mapping.
