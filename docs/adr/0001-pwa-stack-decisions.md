# ADR 0001 — PWA Stack Decisions

**Date**: 2026-03-14
**Status**: Accepted
**Context**: Scaffolding the PWA inbound adapter (issue #19)

---

## 1. Vite over Next.js

Pax is a personal productivity tool with no public-facing pages. SSR and SSG add no value. The backend is already a Bun HTTP server — we don't need Next.js's API routes on top of that. Vite fits naturally into the Bun toolchain and keeps the mental model simple: one bundler, one server, no framework conventions.

If Pax ever needs SSR or a public-facing surface, revisit.

---

## 2. Thin fetch wrapper, not axios

A small typed wrapper around `fetch` covers everything we need: base URL, auth header, error surfacing with status and body. Axios adds ~14 KB for interceptors and cancellation we don't use. The wrapper lives in `lib/api-client.ts` and is the only way features talk to the server.

If cross-cutting concerns (retry, auth refresh, logging) grow, reconsider.

---

## 3. VITE_API_TOKEN is a temporary scaffold

The server requires a bearer token on all `/api/*` routes via `WEB_AUTH_TOKEN`. During development the client needs to send it. Baking it into the Vite env (`VITE_API_TOKEN`) is the simplest way to wire that up before proper auth exists.

This is not suitable for production — the token is visible in the bundle and devtools. Once issue #21 (Better Auth, Google + Line OAuth) ships, `VITE_API_TOKEN` goes away and auth moves to httpOnly session cookies issued by the server. The `TODO(#21)` comment in `api-client.ts` marks exactly what to remove.
