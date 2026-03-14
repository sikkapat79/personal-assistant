# Web Client Architecture

`src/adapters/inbound/web/client/` — Vite + React 19 + Tailwind v4 PWA.

## Folder structure

```
client/
  index.html
  vite.config.ts
  tsconfig.json          ← standalone (does NOT extend root tsconfig)
  src/
    main.tsx             ← React entry point, mounts <App />
    App.tsx              ← top-level shell only; routing/layout goes here when added
    features/
      pomodoro/          ← issue #20
      tasks/             ← future
    components/
      ui/                ← shared dumb primitives (buttons, inputs, etc.)
    lib/
      api-client.ts      ← typed fetch wrapper; single exported `apiClient` instance
    styles/
      globals.css        ← Tailwind import + global resets only
server/
  index.ts               ← Bun HTTP server
  public/                ← Vite build output (gitignored)
```

## Feature module pattern

Each feature is a self-contained directory under `features/`. It owns its own components, hooks, and local state. It imports from `lib/api-client` and `components/ui` — never from sibling features.

```
features/pomodoro/
  index.ts               ← re-exports the feature's root component
  PomodoroPage.tsx        ← page-level component
  usePomodoro.ts          ← local state / logic hook
  components/
    TimerDisplay.tsx
    ControlBar.tsx
```

## Routing

**react-router-dom** (v7) with `BrowserRouter`. Routes are declared in `App.tsx`. Do not use file-based routing frameworks. Add new `<Route>` entries in `App.tsx` when a feature's page component is ready.

## State management

- **Local component state** (`useState`, `useReducer`) — first choice for UI state.
- **Zustand** — for state shared across components within a feature, or cross-feature (e.g. a global timer tick). Already in `dependencies`. One store per feature domain; avoid a single global mega-store.
- No Redux, no Context for data (only for DI/theming if needed).

## API calls

All server communication goes through `lib/api-client.ts`. The `apiClient` singleton is the only export. Features call it directly from hooks — no intermediate service layer.

```ts
// in a hook
const todos = await apiClient.getTodos();
```

Errors propagate as thrown `Error` instances with the HTTP status in the message. Callers decide how to surface them.

## Styling

Tailwind v4 via `@tailwindcss/vite`. No PostCSS config needed.

- Utility classes directly in JSX — no CSS modules.
- `globals.css` is for Tailwind's `@import "tailwindcss"` and any genuine global resets only. Do not add component styles there.
- Shared design tokens (colors, spacing) come from Tailwind config if they diverge from defaults.
- No CSS-in-JS.

## Component conventions

- One component per file.
- File name = component name (PascalCase).
- Props interface defined inline in the same file, named `{ComponentName}Props`.
- Prefer named exports over default exports.
- `components/ui/` holds purely presentational primitives with no API or state dependencies.

## tsconfig isolation

The web client tsconfig is **standalone** — it does not extend the root `tsconfig.json`. This is intentional:

- Root uses `jsxImportSource: "@opentui/react"` (TUI runtime) and `types: ["bun-types"]`.
- Client needs `jsxImportSource: "react"` and `lib: ["DOM"]`.

Never add web-client settings to the root tsconfig. The root `exclude` list includes `src/adapters/inbound/web/client/src` to keep `bun run build` (root tsc) clean.

## Build & dev commands

| Script | What it does |
|---|---|
| `bun run web:dev` | Vite dev server; proxies `/api` to `:3001` |
| `bun run web:build` | Vite production build → `server/public/` |
| `bun run web:server` | Bun API + static server on `:3001` |
| `bun run web` | build + serve |

## Env vars

| Var | Used by | Purpose |
|---|---|---|
| `WEB_AUTH_TOKEN` | server | Bearer token required for all `/api/*` routes |
| `VITE_API_URL` | client | API base URL (empty = same origin; set in dev if server is on different port) |
| `VITE_API_TOKEN` | client | Bearer token sent with every API request |
