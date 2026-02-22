# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- (Nothing yet.)

## [0.1.0] - (initial release)

- CLI: `journal` with subcommands (log, todos, today, agent).
- TUI: OpenTUI-based UI with first-run setup, Pax chat, Profile & Settings (Ctrl+P).
- Notion: Logs and TODOs adapters with configurable column mapping.
- Pax agent: OpenAI-backed agent with tools for logs and tasks; behaviour in `agent-context/`.
- Config: `~/.pa/` (profile, settings); env override.
- Optional HTTP API: `bun run ui`.

[Unreleased]: https://github.com/your-org/Pax/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/Pax/releases/tag/v0.1.0
