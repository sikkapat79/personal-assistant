# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Local-first hydration**: `hydration.ts` now uses `listOpen()` instead of `listAll()` when
  seeding the local snapshot, preventing Done tasks from appearing in the open-task list when
  `NOTION_TODOS_STATUS` is a select column without `NOTION_TODOS_DONE_VALUE` configured.
- **Log snapshot write-through**: `LocalLogsAdapter` now persists each log write directly to
  `snapshot_logs` via `IEventQueue.upsertSnapshotLog`. Previously, once a log event was synced
  to Notion (`synced=1`), it left `pendingSync()` but never reached the snapshot — after a
  restart the projection lost visibility of that log, causing Pax to report "no log for today".

## [0.1.0] - (initial release)

- CLI: `journal` with subcommands (log, todos, today, agent).
- TUI: OpenTUI-based UI with first-run setup, Pax chat, Profile & Settings (Ctrl+P).
- Notion: Logs and TODOs adapters with configurable column mapping.
- Pax agent: OpenAI-backed agent with tools for logs and tasks; behaviour in `agent-context/`.
- Config: `~/.pa/` (profile, settings); env override.
- Optional HTTP API: `bun run ui`.

[Unreleased]: https://github.com/your-org/Pax/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/Pax/releases/tag/v0.1.0
