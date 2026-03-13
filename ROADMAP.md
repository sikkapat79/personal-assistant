# Pax Roadmap

## Stack decisions

| Concern | Choice |
|---|---|
| DB | Turso (libSQL) — shared event log, embedded replicas |
| ORM | Drizzle — dev-first, TypeScript-native, libSQL support |
| Cross-device sync | Turso replication — replaces custom SyncEngine for tasks |
| Notion | Logs + documents only — not task sync |
| PWA | Vite + React + TypeScript + vite-plugin-pwa |
| Styling | Tailwind CSS |
| State (web) | Zustand — feature-scoped, one store per feature |
| Deploy | Local + cloudflared tunnel |
| Auth | Bearer token (single user) |

---

## Phase 1 — Turso + Drizzle migration

Replace `bun:sqlite` + custom task sync with Turso + Drizzle. Event sourcing pattern unchanged — only the outbound adapter changes. The port (`IEventQueue`) stays exactly as-is.

### What changes
- New outbound adapter: `src/adapters/outbound/turso/turso-event-queue.ts` — implements `IEventQueue`, replaces `BunSqliteEventQueue`
- New Drizzle schema: `src/adapters/outbound/turso/schema.ts`
- New Drizzle client: `src/adapters/outbound/turso/client.ts`
- `src/composition.ts` — inject `TursoEventQueue` instead of `BunSqliteEventQueue`
- `SyncEngine` — remove task sync, keep log sync to Notion
- Settings + first-run wizard — add `TURSO_URL`, `TURSO_TOKEN`
- Migrations — replace `001_initial.sql` with Drizzle-managed migrations

### What does NOT change
- `IEventQueue` port
- `LocalProjection`, `LocalAdapterBase`, `LocalTodosAdapter`, `LocalLogsAdapter`
- All use cases
- Notion log sync
- TUI code

### New env vars
```
TURSO_URL=libsql://your-db.turso.io
TURSO_TOKEN=your-token
```

### Cross-device sync
TUI uses embedded replica (local file + auto-sync to Turso remote):
```ts
createClient({ url: 'file:pax.db', syncUrl: TURSO_URL, authToken: TURSO_TOKEN })
```

PWA BE uses remote directly:
```ts
createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
```

### Scripts
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

### Verification
- TUI works as before (tasks, logs, status picker, done basket)
- Complete a task on device A → appears on device B
- Logs still sync to Notion

---

## Phase 2 — PWA scaffold

### Folder structure
```
src/adapters/inbound/web/
  client/
    index.html
    vite.config.ts
    tsconfig.json          ← extends root tsconfig, overrides jsxImportSource: "react"
    src/
      main.tsx
      App.tsx              ← routing only, no logic
      features/
        pomodoro/          ← Phase 3
        tasks/             ← stub, Phase 4+
      components/
        ui/                ← shared dumb primitives
      lib/
        api-client.ts      ← typed fetch wrapper
      styles/
        globals.css
  server/
    index.ts               ← Bun HTTP server, singleton compose(), serves API + static files
```

### Critical: separate tsconfig
The root `tsconfig.json` uses `"jsxImportSource": "@opentui/react"` (terminal UI runtime). The web client needs standard React JSX. `web/client/tsconfig.json` overrides this — never modify the root tsconfig for web settings.

### Web API server
Singleton `compose()` — init once, not per request.

Bearer token middleware for all `/api/*` routes.

Endpoints:
- `GET /api/todos` — list open tasks
- `POST /api/todos` — add task
- `PATCH /api/todos/:id` — update task
- `POST /api/todos/:id/complete` — complete task
- `GET /api/today` — today's log

Serves `web/client/dist` as static files in production.

### Scripts
```json
"web:dev": "vite --config src/adapters/inbound/web/client/vite.config.ts",
"web:build": "vite build --config src/adapters/inbound/web/client/vite.config.ts",
"web:server": "bun src/adapters/inbound/web/server/index.ts",
"web": "bun run web:build && bun run web:server"
```

### New env vars
```
WEB_AUTH_TOKEN=your-secret
```

---

## Phase 3 — Pomodoro

### Data model
```ts
type PomodoroPhase = 'work' | 'short-break' | 'long-break';

interface PomodoroSettings {
  workMinutes: number;           // default: 25
  shortBreakMinutes: number;     // default: 5
  longBreakMinutes: number;      // default: 15
  cyclesBeforeLongBreak: number; // default: 4
}

interface PomodoroState {
  phase: PomodoroPhase;
  isRunning: boolean;
  startedAt: number | null;   // Date.now() when current segment started
  pausedAt: number | null;    // Date.now() when paused
  elapsedMs: number;          // accumulated ms before current segment
  completedCycles: number;
  settings: PomodoroSettings;
}
```

### State: localStorage only (MVP)
Zustand + `persist` middleware. No server needed for timer state.

Cross-device sync for timer is deferred — YAGNI. Each device tracks its own session.

### Architecture
```
features/pomodoro/
  store/
    pomodoroStore.ts     ← zustand + persist (localStorage)
  hooks/
    usePomodoro.ts       ← derives remainingSeconds, progressPercent on 1s interval
  components/
    TimerDisplay.tsx     ← MM:SS + phase label
    TimerControls.tsx    ← Start / Pause / Reset
    PhaseIndicator.tsx   ← cycle dots
    SettingsPanel.tsx    ← duration inputs
  types.ts
  index.ts
```

### Key rule: no side effects in store
Store holds raw timestamps only. `usePomodoro` hook derives display values from `Date.now()` on a 1-second interval. Store actions: `start`, `pause`, `resume`, `reset`, `completePhase`, `updateSettings`.

---

## Web adapter conventions

These apply to all code under `src/adapters/inbound/web/client/`.

### Toolchain
- Vite + React + TypeScript. Tailwind CSS. vite-plugin-pwa.
- `tsconfig.json` inside `web/client/` overrides `jsxImportSource` to `"react"`.
- Never modify the root `tsconfig.json` for web settings.
- Never import from `@opentui/react` or `@opentui/core` — TUI-only.

### Structure rules
- `features/` — one folder per domain. Each owns its components, hooks, store, types.
- `components/ui/` — shared primitives only. No data fetching, no business logic.
- `lib/api-client.ts` — all HTTP calls go here. No raw `fetch()` in components.
- `App.tsx` — routing and layout only. No logic.

### State management (simplest that works)
1. `useState` — local UI state in one component
2. `useReducer` — local state with multiple actions
3. Feature-scoped Zustand store — shared within one feature
4. No global mega-store. Each feature has its own store file.

### Component rules
- One component per file. Filename matches export name.
- Props defined as `interface` at top of file before the component.
- No prop drilling beyond 2 levels — lift to store.
- Tailwind only. No inline styles.

### Data fetching
- All API calls through `lib/api-client.ts`.
- Fetch in hooks, not in components.
- `useEffect` + `useState` for now. Add React Query when caching becomes painful.

### What NOT to do
- Don't import from `src/adapters/inbound/cli/` — no sharing between inbound adapters.
- Don't call `compose()` from client — app layer access via HTTP API only.
- Don't put business logic in components.

---

## Future phases

- **Phase 4** — Tasks view in PWA (read + update tasks from browser/phone)
- **Phase 5** — YNAB integration — OCR receipts, auto-categorize, post to YNAB API
- **Phase 6** — Notifications (Web Push for pomodoro end, task reminders)
