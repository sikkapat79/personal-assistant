# Agent guide (Pax – self-discipline journal)

Quick reference for AI agents working on this codebase.

## Conventions

- **One function, class, or component per file.** Keep one main export per file; use thin entry points. See `.cursor/rules/one-function-per-file.mdc`.
- **KISS, DRY & SOLID.** Prefer the simplest solution (KISS); avoid duplication (DRY); follow SOLID (e.g. ports in `application/ports/`, composition wires adapters). See `.cursor/rules/design-principles.mdc`.
- **TypeScript/Bun.** No build step for running; imports are plain TS. Use existing paths (e.g. `../../../../config/...` from nested folders under `src/`).
- **File size and context proximity.** When a use-case or module grows beyond ~300 lines, extract by cohesive context into a feature subfolder (e.g. `use-cases/agent/`); keep the main file as a thin orchestrator. See `.cursor/rules/file-size-and-context-proximity.mdc`.
- **Plans and proposals.** Plans in `.cursor/plans/`; use `*.local.md` for local-only (gitignored). For portability, create a GitHub issue (feature-request template). See `.cursor/rules/plans-and-proposals.mdc`.

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
| **agent-context/** | Source of truth for **product behaviour** (logs, tasks). **For coding agents** (e.g. Cursor): land here to understand how Pax should behave; edit here to change behaviour without code changes. Loaded by the app into the runtime agent's prompt. **Not** for defining runtime agents or teammates—those live in application code. |

## Behaviour and data rules

**agent-context/** is the source of truth for log and task behaviour. It is **for coding agents** (the AI helping you develop this repo): read `agent-context/README.md`, `agent-context/rules/data.md`, and `agent-context/docs/journal-and-tasks.md` to understand how the app should behave. The app loads these files into the runtime agent's system prompt. Edit them to change behaviour without code changes. **Do not** put runtime-agent concerns here (e.g. teammate descriptions, orchestrator routing)—those belong in application code that builds the prompt.

**Notion metadata: database and column purpose.** Each Notion column has exactly one purpose (what that column stores). Database purpose (what the DB is for, e.g. "Tasks", "Daily journal") is separate and stored in scope; column purpose lives in `src/adapters/outbound/notion/notion-schema.ts` and is used for humans (docs, TUI) and for Pax (agent context, prompts, tools).

## Agent chat and session history

Long chat history is handled in **application/use-cases/agent-use-case.ts**: only the last `MAX_RECENT_MESSAGES` (16) messages are sent to the LLM in full; older turns are summarized into a single "Earlier in this session" summary. To avoid re-summarizing on every turn, the use-case uses **incremental caching** on the instance: `lastSummarizedIndex` (length of the prefix already summarized) and `cachedSessionSummary`. When the old-part length has not increased, the cached summary is returned; when it has, only the new slice is summarized and merged with the cache. Cache is invalidated when history is short or shrinks (e.g. after `/clear`). See `buildEffectiveHistory`, `summarizeConversation`, and the cache fields in that file.

## Commands

- `bun run journal` – interactive CLI.
- `bun run tui` – terminal UI (entry: `src/adapters/inbound/cli/tui-app.tsx`).
- `bun run ping` – validate Notion connection and column mapping.
