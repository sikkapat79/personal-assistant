# Pax metadata: database and column purposes

## Overview

Two distinct "purpose" concepts must stay clear and documented so agents and code don't conflate them:

- **Database purpose** — generic for many databases: what each database is for.
- **Column purpose** — one purpose per column: what that column stores.

---

## 1. Database purpose (generic for many databases)

- **Meaning:** Each database has exactly one purpose: a short description of **what this database is for** (e.g. "Daily journal", "Tasks", or user-defined for extra DBs).
- **Scope:** Applies to **all** databases Pax knows about: logs, todos, and any future extra databases. It is a generic concept, not specific to logs/todos.
- **Where stored:** In metadata scope ([AllowedNotionScope](src/application/dto/metadata.ts)):
  - Today: `logsPurpose`, `todosPurpose` (set at bootstrap in [metadata-bootstrap.ts](src/config/metadata-bootstrap.ts)).
  - Later: for extra DBs, e.g. `extraDatabases?: { databaseId: string; purpose?: string }[]` so every DB can have a purpose.
- **Rule:** One purpose per database. Used by agent and TUI to know what each DB is for; keep it generic so it scales to many databases.

---

## 2. Column purpose (one per column)

- **Meaning:** Each column has exactly one purpose: what **this column stores** (e.g. "Current state of the task", "Task title", "When due").
- **Where stored:** In code only: [notion-schema.ts](src/adapters/outbound/notion/notion-schema.ts) (`NOTION_SCHEMA_PURPOSE`). Not in metadata (DatabaseSchema has only `name` and `notionType`).
- **Rule:** One purpose per column. Do not mix concerns (e.g. Status in todos = current task state only).

**Example — Todos Status/done column:** Purpose is **"Current state of the task (Todo, In Progress, Done)"** — i.e. how to represent the current state for that task. Refine from "Completion flag" in notion-schema to this wording and add a short design note in that file.

---

## 3. Don't forget either

- **Database purpose** = generic, per-database, stored in scope; applies to logs, todos, and future extra DBs.
- **Column purpose** = per-column, in notion-schema only; one purpose per column (e.g. Status = task state).

Document both in AGENTS.md (or equivalent) so neither is forgotten when context is limited.

---

## Implementation checklist (from original column-purpose plan)

- Document in AGENTS.md: (1) database purpose is generic, one per database, for many DBs; (2) column purpose is one per column; keep the two distinct.
- In [notion-schema.ts](src/adapters/outbound/notion/notion-schema.ts): set `done` purpose to "Current state of the task (Todo, In Progress, Done)"; add a one-line note that each column has exactly one purpose.
- Optional: in [pax-metadata-storage-layer.md](./pax-metadata-storage-layer.md), add a line that database purpose is generic for all DBs and column purpose is single-responsibility per column.
- When adding extra databases later: store each DB's purpose in scope (e.g. `extraDatabases: { databaseId, purpose }[]`) so database purpose remains the single place for "what this DB is for."
