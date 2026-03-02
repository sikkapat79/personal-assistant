# Pax – Self-discipline daily journal

CLI and optional **Pax** agent for daily logs and TODOs in Notion.

**Data:** Every log and task field is meaningful. Pax and the app preserve existing data and support partial updates (e.g. update only workout or deep work hours). When there is no log for today, Pax asks only for sleep and mood after they woke up. Summaries include score for the day, an overall line, and done & undone tasks. Task status is **Todo**, **In Progress**, or **Done** (aligned with Notion). See `agent-context/` for editable rules and docs.

## Quick start (TUI)

1. Create a [Notion integration](https://www.notion.so/my-integrations) and two databases (see **Setup** below for required properties). Share both DBs with the integration.
2. Run `bun run tui`. On first run you’ll be asked for:
   - **OpenAI API key** (optional; for Pax).
   - **Notion API key**, **Logs database ID**, **TODOs database ID**.
3. The app then connects to Notion, scans your database property names, and suggests column mappings. Confirm or override each field; values are saved to `~/.pa/settings.json`. Press Esc at any time to skip column setup (default names are used).
4. Your **display name** and other settings can be edited later via **Ctrl+P** (Profile & Settings) in the TUI.

## Config and profile

- **Directory:** `~/.pa/` (or `$XDG_CONFIG_HOME/pa` on Linux). Created automatically.
- **profile.json** – Display name (used in “Welcome back …”). Defaults to `USER` / `USERNAME` or “there”.
- **settings.json** – Notion API key, Logs/TODOs database IDs, optional column overrides (`NOTION_LOGS_*`, `NOTION_TODOS_*`), and optional `OPENAI_API_KEY` / `OPENAI_MODEL`. Environment variables override file values.
- In the TUI, **Ctrl+P** opens Profile & Settings; **Esc** or **Ctrl+P** again returns to the main screen.

## Setup (manual)

If you prefer not to use the TUI first-run wizard:

1. Create a [Notion integration](https://www.notion.so/my-integrations) and copy the API key.
2. Create two databases in Notion with these properties (see `src/adapters/outbound/notion/notion-schema.ts` for full purpose and types):
   - **Logs DB:** Title (title), Date (date), Score (number), Mood (number 1–5), Energy (number 1–100 = energy budget for that day; derived from daily check-in—sleep, mood, yesterday—not asked from user), Deep Work Hours (number), Workout (checkbox), Diet (checkbox), Reading Mins (number), Went Well (text), Improve (text), Gratitude (text), Tomorrow (text). [B] = user paragraphs → app/agent translates. [C] = Tomorrow = TODOs for next day from energy/priority/due.
   - **TODOs DB:** Title (title), Category (select: Work | Health | Personal | Learning), Due Date (date), Notes (text), Priority (select: High | Medium | Low), Status (checkbox or Status/select). Task status in the app is **Todo**, **In Progress**, **Done**. If the Status column is a select (e.g. Todo | In Progress | Done), the app auto-detects the options; you can override with `NOTION_TODOS_STATUS`, `NOTION_TODOS_DONE_VALUE`, `NOTION_TODOS_OPEN_VALUE`, and `NOTION_TODOS_IN_PROGRESS_VALUE` in `.env` or `~/.pa/settings.json` (see `.env.example`).
3. Share both databases with your integration (••• → Add connections).
4. Copy the database IDs from the URLs: `notion.so/workspace/DATABASE_ID?v=...`
5. Either:
   - **Option A:** Copy `.env.example` to `.env` and set `NOTION_API_KEY`, `NOTION_LOGS_DATABASE_ID`, `NOTION_TODOS_DATABASE_ID`, and optionally `OPENAI_API_KEY` / `OPENAI_MODEL`.
   - **Option B:** Create `~/.pa/settings.json` with the same keys (see `.env.example`). Env vars override file values.
6. If your Notion property names differ from the defaults, set column mapping in `.env` or `~/.pa/settings.json` (see `.env.example` for all `NOTION_LOGS_*` and `NOTION_TODOS_*` overrides). Run `bun run ping` or `bun run test:notion-mapping` to validate IDs and columns.

## Run (Bun, no build)

The project runs with **Bun** (TypeScript executed directly, no `tsc` build). Imports are plain TypeScript (no `.js` extensions).

- `bun run journal` or `bun run src/adapters/inbound/cli/index.ts`

## Commands

- `bun run journal` – interactive menu.
- `bun run ping` – check connection and validate DB + column mapping (prints configured columns). Uses config from env or `~/.pa/settings.json`.
- `bun run test:notion-mapping` – same validation as ping (for CI or scripts).
- `journal log` – upsert today’s log (Phase 2).
- `journal todos list | add "..." | complete <id>` – TODOs (Phase 3).
- `journal today` – today summary.
- `journal agent` – chat with **Pax** (OpenAI; set `OPENAI_API_KEY` in env or `~/.pa/settings.json` to enable).
- `bun run ui` – optional local HTTP UI at http://localhost:3000 (GET /today, POST /log, GET /todos).
- `bun run tui` – terminal UI (OpenTUI): welcome panel, tips, recent activity, and Pax chat. On first run with no config, prompts for OpenAI key (optional), Notion API key, and DB IDs, then scans databases and asks you to confirm column mapping field by field. **Ctrl+P** opens Profile & Settings (display name, view/edit config). Run in an interactive terminal (requires TTY).

## Scheduling (Phase 6)

To run the journal daily (e.g. morning reminder):

- **cron:** `0 8 * * * cd /path/to/Pax && bun run daily`
- **macOS launchd:** create a plist that runs `bun run daily` at a set time.

The `daily` script runs `journal today`. Optionally use `node-notifier` or `osascript` in `scripts/daily-reminder.sh` to show a system notification.

## Project layout

- **domain/** – entities (DailyLog, Todo), value objects. No I/O.
- **application/ports/** – ILogsRepository, ITodosRepository, IEventQueue, event-types (EntityType/EventType enums), DTOs.
- **application/use-cases/** – log, todos, agent (orchestration only).
- **adapters/inbound/cli/** – CLI entry (`index.ts`), interactive prompt, and TUI. TUI is split into a thin entry and a module:
  - **tui-app.tsx** – entry only: create CLI renderer, mount `<AppRoot />`.
  - **tui/** – TUI module: `App.tsx` (164 lines, thin coordinator), Zustand store, feature-based structure (`chat/`, `tasks/`, `log/`, `settings/`, `layout/`, `hooks/`).
- **adapters/outbound/notion/** – Notion API adapters (sync write targets; not queried at startup).
- **adapters/outbound/local/** – Local-first layer:
  - `BunSqliteEventQueue` – write queue + snapshot cache (`~/.pa/pax.db`, bun:sqlite)
  - `LocalProjection` – in-memory projection with registered handler dispatch
  - `LocalAdapterBase` – base class for domain adapters; `write()` handles all event boilerplate
  - `LocalTodosAdapter` / `LocalLogsAdapter` – implement repository ports; reads from projection, writes to queue
  - `SyncEngine` – background 10s flush; pushes pending events to Notion; conflict resolution via timestamp vs Notion `last_edited_time`
  - `hydration.ts` – pulls Notion state on startup (background, non-blocking)
- **agent-context/** – editable docs, rules, and skills for the agent. Loaded each run; edit to change agent behaviour without code changes.

## License and community

- **License:** [MIT](LICENSE).
- **Support:** [GitHub Sponsors](https://github.com/sponsors/sikkapat79) – optional way to support the project.
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md) – setup, conventions, how to send a PR.
- **Code of conduct:** [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Security:** [SECURITY.md](SECURITY.md) – how to report vulnerabilities.
