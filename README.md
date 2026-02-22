# pa – Self-discipline daily journal

CLI and optional agent for daily logs and TODOs in Notion.

**Data:** Every log and task field is meaningful. The agent and app preserve existing data and support partial updates (e.g. update only workout or deep work hours). When there is no log for today, the agent asks only for sleep and mood after they woke up. Summaries include score for the day, an overall line, and done & undone tasks. See `agent-context/` for editable rules and docs.

## Setup

1. Create a [Notion integration](https://www.notion.so/my-integrations) and copy the API key.
2. Create two databases in Notion with these properties (see `src/adapters/outbound/notion/notion-schema.ts` for full purpose and types):
   - **Logs DB:** Title (title), Date (date), Score (number), Mood (number 1–5), Energy (number 1–10 = energy budget for that day; derived from daily check-in—sleep, mood, yesterday—not asked from user), Deep Work Hours (number), Workout (checkbox), Diet (checkbox), Reading Mins (number), Went Well (text), Improve (text), Gratitude (text), Tomorrow (text). [B] = user paragraphs → app/agent translates. [C] = Tomorrow = TODOs for next day from energy/priority/due.
   - **TODOs DB:** Title (title), Category (select: Work | Health | Personal | Learning), Due Date (date), Notes (text), Priority (select: High | Medium | Low), Done (checkbox).
3. Share both databases with your integration (••• → Add connections).
4. Copy the database IDs from the URLs: `notion.so/workspace/DATABASE_ID?v=...`
5. Copy `.env.example` to `.env` and set:
   - `NOTION_API_KEY`
   - `NOTION_LOGS_DATABASE_ID`
   - `NOTION_TODOS_DATABASE_ID`
   - (Optional) `OPENAI_API_KEY` for the journal agent; `OPENAI_MODEL` defaults to `gpt-4o-mini`.
6. If your Notion property names differ from the defaults, set column mapping in `.env` (see `.env.example` for all `NOTION_LOGS_*` and `NOTION_TODOS_*` overrides). Run `npm run ping` or `npm run test:notion-mapping` to validate IDs and columns.

## Run (TypeScript, no build)

The project runs with **tsx** in transpile mode (no `tsc` build). Imports are plain TypeScript (no `.js` extensions).

- **Node:** `npm run journal` or `npx tsx src/adapters/inbound/cli/index.ts`
- **Bun:** `bun run src/adapters/inbound/cli/index.ts` (if you prefer Bun)

## Commands

- `npm run journal` – interactive menu.
- `npm run ping` – check connection and validate DB + column mapping (prints configured columns).
- `npm run test:notion-mapping` – same validation as ping (for CI or scripts).
- `journal log` – upsert today’s log (Phase 2).
- `journal todos list | add "..." | complete <id>` – TODOs (Phase 3).
- `journal today` – today summary.
- `journal agent` – chat with agent (OpenAI; set `OPENAI_API_KEY` in `.env` to enable).
- `npm run ui` – optional local HTTP UI at http://localhost:3000 (GET /today, POST /log, GET /todos).
- `npm run tui` – terminal UI (Ink): welcome panel, tips, recent activity, and agent chat. Run in an interactive terminal (requires TTY).

## Scheduling (Phase 6)

To run the journal daily (e.g. morning reminder):

- **cron:** `0 8 * * * cd /path/to/pa && npm run daily`
- **macOS launchd:** create a plist that runs `npm run daily` at a set time.

The `daily` script runs `journal today`. Optionally use `node-notifier` or `osascript` in `scripts/daily-reminder.sh` to show a system notification.

## Project layout

- **domain/** – entities (DailyLog, Todo), value objects. No I/O.
- **application/ports/** – ILogsRepository, ITodosRepository, etc.
- **application/use-cases/** – log, todos, agent (orchestration only).
- **adapters/inbound/cli/** – CLI entry, interactive prompt, and TUI (tui-app.tsx).
- **adapters/outbound/notion/** – Notion API adapters.
- **agent-context/** – editable docs, rules, and skills for the agent (data rules, journal/task reference). Loaded each run; edit to change agent behaviour without code changes.
