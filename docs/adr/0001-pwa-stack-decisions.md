# ADR 0001 — PWA Stack Decisions

**Date**: 2026-03-14
**Status**: Accepted
**Context**: Scaffolding the PWA inbound adapter (issue #19)

---

## 1. Vite over Next.js

**Decision**: Use Vite + React 19, not Next.js.

**Alternatives considered**:
- Next.js (App Router): SSR/SSG, file-based routing, built-in API routes, large ecosystem
- Vite: bundler/dev server only; no opinions on routing or data fetching

**Reasons for Vite**:
- Pax is a personal productivity tool with no public-facing pages — SSR and SSG add zero value
- The backend is a Bun HTTP server (`server/index.ts`); we don't need Next.js's API routes duplicating that
- Vite integrates cleanly with Bun's native toolchain and `bun run` scripts
- Significantly simpler mental model: no `"use client"` / `"use server"` split, no App Router conventions to learn or maintain

**Trade-offs accepted**:
- No SSR. Any SEO or first-paint requirements in future would require revisiting.
- File-based routing not available; routes are declared manually in `App.tsx`.

---

## 2. Manual fetch wrapper over axios

**Decision**: Use a thin typed fetch wrapper (`lib/api-client.ts`) instead of axios.

**Alternatives considered**:
- axios: interceptors, automatic JSON parsing, request cancellation, wider browser support
- fetch (native): no dependency, explicit control

**Reasons for fetch wrapper**:
- No interceptor logic needed at this stage
- Request cancellation (AbortController) not yet required
- axios adds ~14 KB to the bundle for features we don't use
- The wrapper already handles the only things we need: base URL injection, auth header, error surfacing with status + body

**Trade-offs accepted**:
- If cross-cutting concerns (auth refresh, retry, logging) grow, an axios migration or a custom interceptor layer may be warranted.

---

## 3. VITE_API_TOKEN as temporary auth scaffold

**Decision**: Bundle a bearer token (`VITE_API_TOKEN`) in the Vite client env as a short-term auth mechanism. Will be removed when issue #21 (Better Auth) lands.

**Why it exists now**:
- The Bun server already validates `WEB_AUTH_TOKEN` via `Authorization: Bearer` header
- The client needs to send that token on every request during development
- Without issue #21's session infrastructure, there is no safe per-user auth flow yet

**Why it's temporary**:
- A bearer token baked into a client bundle is not suitable for production: it's visible in source maps, the bundle, and browser devtools
- Issue #21 will replace this with httpOnly session cookies issued by the server after OAuth (Google + Line)

**Removal criteria**: once `#21` ships, delete `VITE_API_TOKEN` from `.env`, remove the `this.token` field and `Authorization` header from `ApiClient`, and remove the `TODO(#21)` comment in `api-client.ts`.
