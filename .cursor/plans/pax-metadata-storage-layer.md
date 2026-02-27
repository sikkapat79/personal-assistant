# Pax metadata storage layer

> **Scope:** This plan is large. Implement incrementally: do migration + scope + file adapter first, then provenance, then cached schema + dynamic LLM context. Do not try to deliver everything in one pass.

## Possible gaps (checklist)

- **Scope must identify logs vs todos:** [NotionConfig](src/adapters/outbound/notion/client.ts) needs `logsDatabaseId` and `todosDatabaseId` separately. Store in scope e.g. `logsDatabaseId`, `todosDatabaseId` (and optionally `extraDatabaseIds: string[]` for future DBs), not only a flat `allowedDatabaseIds`, so composition can build Notion config from metadata without reading settings.
- **DatabaseSchema shape:** Define the type (e.g. `{ databaseId: string; properties: { name: string; notionType: string }[] }` or similar) so adapter and bootstrap are unambiguous.
- **Metadata format version:** Add a `version: number` (or `schemaVersion: 1`) in the JSON so we can migrate the file format later without breaking old installs.
- **Bootstrap failure:** If required settings are missing (e.g. no NOTION_LOGS_DATABASE_ID), skip or partial bootstrap: leave metadata empty or only write what we have; keep falling back to settings so existing "no config yet" flow still works.
- **Tests:** Plan Phase 1 to include tests for the file adapter (read/write, empty file) and for bootstrap (from settings to metadata shape).
- **refreshSchemaFromNotion:** The port can stay get/setCachedSchema only; "refresh" can live in a Notion adapter or small use-case that fetches from API then calls setCachedSchema. Plan already notes this; no change needed.
- **Other plans:** Reminders, extended Notion, and calendar plans live outside this repo or are not yet in `.cursor/plans/`. Consider adding a short roadmap in `.cursor/plans/README.md` that lists all initiatives and order (metadata first, then extended Notion, then reminders/calendar as needed).
- **TUI and database purpose:** For extra databases (future), TUI should support a short conversation or flow where the user adds a DB and describes its purpose. Logs and todos: we already know — add them with fixed purpose at bootstrap (e.g. "Daily journal", "Tasks"); no TUI conversation for those.
- **Column purpose:** Each Notion column has a single responsibility (what that column stores). Database purpose is separate. For example, Status in the todos table is for current task state only (Todo | In Progress | Done).

## Why this changes the game

Today Pax is largely **stateless** between runs:

- **Config:** [~/.pa/settings.json](src/config/settings.ts) and [~/.pa/profile.json](src/config/profile.ts) hold Notion DB IDs, column mapping, and API keys. No record of *what Pax did* or *what exists*.
- **Source of truth:** Notion alone. We don't store which pages/blocks Pax created, last sync time, or a cached schema for extra databases.

Once Pax can **create and edit pages/blocks** (and later use calendar, multiple DBs), we need **better metadata** so that:

1. **Provenance** – We know which pages/blocks Pax created or modified, so we can update them later, show history, or avoid re-creating.
2. **Schema and scope** – We know which DBs/pages are allowed and their structure (properties, block types), beyond the current flat logs/todos mapping in settings.
3. **Sync state** – We have last fetch time, cursors, or a set of "known" resources so we avoid duplicates and conflicts when writing or refetching.

This plan defines that metadata layer **before** (or alongside) the extended Notion (blocks/pages) plan, so extended Notion can depend on it.

## Goals

- **Single place** for Pax metadata: provenance, schema/scope, sync state — including **migrated** current logs/todos structure so Pax reads from one store.
- **Port + file-based adapter** under `~/.pa/` (no new backend). Optionally migrate to SQLite later if the store grows.
- **Backward compatible:** Bootstrap metadata from existing settings on first run; existing config (settings.json, profile.json) remains valid and is **migrated into** the metadata store.
- **Use from:** agent use-case (record after create_notion_page / append_notion_blocks), future calendar adapter (last_sync), and any "allowed scope" checks for Notion; **Notion config** (logs/todos DB IDs and column mapping) is read from metadata after migration.

## Suggested phases (incremental)

- **Phase 1:** Port + file adapter + migration. Types (ProvenanceEntry, SyncState, AllowedNotionScope, DatabaseSchema), IMetadataStore, file adapter, bootstrap from settings on first load. Notion config builder reads scope from metadata when present. No agent changes yet.
- **Phase 2:** Provenance. recordProvenance / getProvenance; call from (future) create_notion_page / append_notion_blocks. Optional: TUI or CLI to list "what Pax created."
- **Phase 3:** Cached schema + dynamic LLM. getCachedSchema / setCachedSchema; bootstrap logs/todos schema in migration; compact summary at session start; get_schema tool. Refactor buildSystemPrompt to use metadata for schema when available.
- **Later (TUI and database purpose):** For **extra** databases, add a TUI flow (or short conversation) where the user adds a DB and describes its purpose; store purpose in metadata. **Logs and todos:** never ask — we already know; bootstrap sets their purpose as "Daily journal" and "Tasks".

---

## Approach

### 1. What to store

**Provenance**

- Entries such as: `{ id: string (page_id or block_id), type: 'page'|'block', parentId?: string, createdByPaxAt: string (ISO), toolCallId?: string, sessionId?: string }`.
- Optional: `updatedByPaxAt`, `summary` (e.g. title or first line). Enough to list "what Pax created" and to update by id.

**Schema and scope**

- **Allowed parents:** e.g. `allowedPageParentIds: string[]`. **Known DBs:** store which id is logs and which is todos so we can build NotionConfig from metadata: e.g. `logsDatabaseId`, `todosDatabaseId`; optionally `extraDatabaseIds: string[]` (or a list of `{ databaseId, purpose?: string }`) for future DBs. Used to restrict create_notion_page to a scope and to build existing adapters without reading settings.
- **Purpose per database:** Store a short **purpose** (or role) per DB so the agent and TUI know what it's for. **Logs and todos:** we already know — set fixed values at bootstrap (e.g. logs = "Daily journal", todos = "Tasks"). **Extra DBs (later):** TUI can run a short conversation where the user adds a DB and describes its purpose; store that in metadata.
- **Cached schema:** For each known/allowed DB, store **property names and types** (e.g. from Notion `databases.retrieve`). Used so we don't refetch every prompt; the agent gets schema from metadata (compact summary at session start + optional get_schema tool). See §8 below.

**Sync state**

- **Per resource type:** e.g. `calendar: { lastFetchedAt: string (ISO), lastEventId?: string }`, `notion_blocks: { lastAppendedPageId?: string }`. Used to avoid duplicate work and for incremental fetches (e.g. calendar).

### 2. Port(s)

Prefer **one port** with a clear surface to keep composition simple:

- **Option A – Single port:** `IMetadataStore` with methods such as:
  - `recordProvenance(entry: ProvenanceEntry): Promise<void>`
  - `getProvenance(filter?: { type?, parentId? }): Promise<ProvenanceEntry[]>`
  - `getAllowedNotionScope(): { pageIds: string[]; databaseIds: string[]; logsDatabaseId?: string; todosDatabaseId?: string }` (or a richer scope type with logs/todos ids and extraDatabaseIds)
  - `setAllowedNotionScope(scope): Promise<void>`
  - `getSyncState(key: string): Promise<SyncState | null>`
  - `setSyncState(key: string, state: SyncState): Promise<void>`
  - `getCachedSchema(databaseId: string): Promise<DatabaseSchema | null>` (for dynamic schema; see §8)
  - `setCachedSchema(databaseId: string, schema: DatabaseSchema): Promise<void>` (or refreshed by an adapter that calls Notion and then writes here)
- **Option B – Split ports:** `IProvenanceStore`, `ISchemaScopeStore` (with get/set scope + get/set cached schema), `ISyncStateStore`. More SOLID but more wiring; can refactor to this if the single store grows too large.

Recommendation: **Option A** for v1; split later if needed. Domain types (ProvenanceEntry, SyncState) live in a small `domain/` or `application/dto/` module so the port stays stable.

### 3. Adapter: file-based under ~/.pa/

- **Location:** Reuse [getConfigDir()](src/config/config-dir.ts) (`~/.pa/` or `$XDG_CONFIG_HOME/pa`). Add a single file, e.g. `metadata.json`, or a subdir `metadata/` with `provenance.json`, `scope.json`, `sync.json` for clarity and safer concurrent access per concern.
- **Format:** JSON. Structure mirrors the port (e.g. `{ version: 1, provenance: ProvenanceEntry[], scope: { allowedPageIds, logsDatabaseId, todosDatabaseId, logsPurpose?, todosPurpose?, extraDatabaseIds?, extraDatabases?: { databaseId, purpose }[], ... }, sync: Record<string, SyncState>, schemas?: Record<string, DatabaseSchema> }` in one file, or separate files per section). Include a `version` field for future format migrations. Logs/todos purpose can be fixed in code (e.g. "Daily journal", "Tasks"); extra DBs get purpose from TUI conversation.
- **Concurrency:** Single process for now; if we later run daemon + CLI, use simple file locking or "read-modify-write" with short retries. Out of scope for v1.
- **Permissions:** Same as existing config (e.g. chmod 0o600) for files that might contain IDs and timestamps.

### 4. When to read/write

- **Provenance:** Written by the agent use-case (or the Notion adapter called by it) after a successful `create_notion_page` or `append_notion_blocks`; read when we need "list what Pax created" or "update this page."
- **Scope:** Read at startup or when checking "is this parent allowed?"; written when the user adds an allowed page/DB (e.g. via TUI or settings). Initial value can come from settings (e.g. `NOTION_PAGES_PARENT_ID` → single allowed page id).
- **Sync state:** Written after a successful calendar fetch, or after appending blocks; read before the next fetch or before "append to this page" to decide incremental behaviour.

### 5. Integration and migration of current structure

- **Do not remove** `settings.json` / `profile.json`. API keys and profile stay there. **Migrate** current Notion structure into the metadata store so Pax has one place for scope and schema.
- **Migrate current structure into the metadata store:** On first run (or when metadata store is empty), **bootstrap** from existing config:
  - Read from settings (and env): `NOTION_LOGS_DATABASE_ID`, `NOTION_TODOS_DATABASE_ID`, and all `NOTION_LOGS_*` / `NOTION_TODOS_*` column mappings.
  - Write into metadata: (1) **Scope:** set `logsDatabaseId`, `todosDatabaseId`, and if `NOTION_PAGES_PARENT_ID` is set add to `allowedPageParentIds`. (2) **Purpose:** set fixed purpose for logs and todos (e.g. logs = "Daily journal", todos = "Tasks") — we already know these; no TUI conversation. (3) **Cached schema:** For the logs DB and todos DB, build a `DatabaseSchema` from the current column mapping (property names and types we already know from [notion-schema](src/adapters/outbound/notion/notion-schema.ts) / client defaults) and call `setCachedSchema` for each. So the existing "structure" (which DBs, which columns) becomes the initial state of the metadata store.
- **After migration:** Composition and Notion adapters can **read** scope and schema from the metadata store (e.g. `getAllowedNotionScope()`, `getCachedSchema(logsDbId)`). When the user changes config in the TUI or settings, **write through** to both settings.json (for backward compatibility and env-override behaviour) and the metadata store (scope + cached schema). That way one source of truth for "what Pax knows" is the metadata store; settings remain the place users (and env) edit.
- **Backward compatibility:** If the metadata store does not exist or is empty, **bootstrap from settings** as above and then proceed. Existing installs get migrated automatically on first run with the new code.

### 6. Files and structure

| Item          | Action                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain / DTOs | Add types: `ProvenanceEntry`, `SyncState`, `AllowedNotionScope`, `DatabaseSchema` (e.g. in `domain/metadata.ts` or `application/dto/metadata.ts`).   |
| Port          | Add `IMetadataStore` in `application/ports/metadata-store.ts` with the methods above.                                                              |
| Adapter       | Add `adapters/outbound/file-metadata-store.ts` (or under `config/`) that reads/writes JSON under `getConfigDir()`.                                   |
| Migration     | On first load or empty store: read settings + env, write scope (allowed DBs + optional parent page) and cached schema for logs/todos into metadata. |
| Composition   | Wire `IMetadataStore`; optionally have Notion config builder read scope/schema from metadata (with bootstrap from settings when metadata empty).    |
| Consume       | Inject into agent use-case and (later) Notion pages adapter and calendar adapter.                                                                  |

### 7. Extended Notion plan dependency

The extended Notion (blocks/pages) plan should:

- **Assume** this metadata layer exists: after each create_notion_page / append_notion_blocks, call `recordProvenance(...)`. Before creating a page, check `getAllowedNotionScope()`.
- **Use** `NOTION_PAGES_PARENT_ID` (or similar) to seed allowed scope so we don't write everywhere.

So the **order of work** is: implement metadata layer first (or in parallel), then add page/block tools that read and write this store.

### 8. Dynamic schema and what we send to the LLM

**Current state:** Pax "knows" schema only from **code**. [AGENT_TOOLS](src/application/dto/agent-tools.ts) hardcode parameters (e.g. `apply_log_update` field names, `add_todo` category enum); [buildSystemPrompt](src/application/use-cases/agent-use-case.ts) uses static prose about logs and tasks. Config only provides *mapping* (which Notion property name maps to which field), not the *shape* of the schema. So we never "send schema" today — it's implicit in tools and prompt.

**After dynamic:** Once Pax can create/edit pages and use more DBs (or user-defined structure), schema is no longer fixed in code. It may come from Notion API (e.g. `databases.retrieve` → property names and types) and differ per user. The question: **do we send up-to-date schema every prompt, or is there a better approach?**

**Options:**

- **Send full schema every turn:** Fetch from Notion (or metadata cache) and include full property list in every system prompt. Always accurate but **expensive** (tokens, latency) and redundant.
- **Compact summary every turn:** Build a short "Databases: Logs (date, title, score, …), Todos (title, category, …), [other DBs from metadata]" and inject at the start of each request. Few hundred tokens; fresh. Acceptable if we keep it small.
- **Schema at session start only:** Load once when the chat session starts (from metadata or Notion), inject into system prompt. No refresh during session unless user says "I added a new database" or we add a "refresh schema" command. **Fewer tokens**, but can go stale mid-session.
- **On-demand only:** Don't put schema in the prompt. Add a **get_schema** (or **get_database_properties**) tool; when the agent needs to create a page in a DB or list valid fields, it calls the tool and we return schema for that DB (from metadata cache or Notion). **Minimal prompt size**; schema only when needed. Risk: agent might not know what's possible without calling the tool first.

**Recommendation (hybrid):**

1. **Store** full schema in metadata: for each allowed DB, cache property names and types (from Notion when DB is added or on first use; optional TTL or manual refresh). So "up to date" is maintained in the store, not by refetching every prompt.
2. **Inject a compact summary at session start:** When the agent session starts (first message), build a short "Databases and properties" block from the metadata store (e.g. "Logs: date, title, score, mood, energy, …; Todos: title, category, due_date, …; [other DBs]") and add it once to the system prompt. Don't re-send every turn. Keeps the agent aware of structure without per-request cost.
3. **Add a get_schema tool:** `get_schema(database_id)` or `get_database_properties(database_id)` returns the full property list (and types) for that DB. Use when the agent works with a new or rarely used DB and needs detail. Implement by reading from metadata cache (or fetching from Notion if missing) and returning a structured summary. So we **don't** send full schema every prompt; we send compact once per session and allow on-demand detail.

**Fixed vs dynamic:** For the **existing** logs and todos DBs we can keep current behavior (implicit in tools + prompt). For **dynamic** DBs (user-added, or page/block creation), schema comes from the metadata-backed cache and the strategy above. That way "each prompt we have to send up to date schema" is avoided: we send a compact, cached summary once per session and optionally on demand via a tool.

**Port surface:** Extend `IMetadataStore` (or add a small `ISchemaProvider` used by the agent) with something like:

- `getCachedSchema(databaseId: string): Promise<DatabaseSchema | null>`
- `refreshSchemaFromNotion(databaseId: string): Promise<DatabaseSchema>` (fetch from API, write to metadata, return).

The agent use-case (or a dedicated "build agent context" helper) then: at session start, calls `getCachedSchema` for each allowed DB, builds compact summary, injects into system prompt; and exposes `get_schema` tool that returns `getCachedSchema(id)` or `refreshSchemaFromNotion(id)` if cache miss.

---

## Summary

- Introduce **metadata storage**: provenance (what Pax created/updated), schema/scope (allowed Notion parents/DBs), sync state (last fetch, etc.).
- **Migrate current structure:** Bootstrap metadata from existing settings on first run: write logs/todos DB IDs into scope and column mapping into cached schema so the current config lives in the metadata store; keep settings.json for API keys and as the place users edit (write-through to metadata when they change Notion config).
- **Port:** `IMetadataStore` with methods for provenance, scope, sync state, and getCachedSchema/setCachedSchema; **adapter:** file-based JSON under `~/.pa/`.
- **Dynamic schema for LLM:** Do not send full schema every prompt. Store schema in metadata; inject a compact summary at session start; add a get_schema tool for on-demand detail (see section 8).
- **Consume** from agent use-case and extended Notion adapter; **seed** scope from existing config (e.g. `NOTION_PAGES_PARENT_ID`). After migration, Notion config (DB IDs, column mapping) is read from metadata where present.
- **Database purpose:** Logs and todos get fixed purpose at bootstrap ("Daily journal", "Tasks"); for extra DBs later, TUI can have a conversation so the user describes each database's purpose and we store it in metadata.
- This makes "Pax can handle database [and page/block] changes" safe and traceable, and sets the base for multi-source calendar sync state later.
- **Implement in phases** (see top of doc) so the work stays manageable.
