# Agent context (docs, rules, skills)

**Update context first.** This folder is the source of truth for how the agent updates logs and tasks. The agent loads it on each run; editing here fixes behaviour without code changes and reduces bugs (e.g. overwriting log fields or forgetting summarize fields).

**Key behaviour (see rules/data.md and docs/journal-and-tasks.md):**
- **Two modes for logs:** (1) Single-field update: only send date + the one field the user mentioned. (2) Summarize: send date + all of score, title, went_well, improve, gratitude, tomorrow, energy. Using the wrong mode causes bugs.
- No log for today → ask only sleep and mood after they woke up.
- Every field is meaningful; preserve existing data.

- **rules/** – Instructions and constraints, injected into the system prompt under "## Rules". Start with `data.md` (log update modes, preserve data, summarize checklist).
- **docs/** – Reference (field list, no-log, summary, energy budget, tasks). Start with `journal-and-tasks.md`.
- **skills/** – Procedures (e.g. summarize-week.md).

Edit these files to change agent behaviour; the next `journal agent` (or chat) run will use the updated content.
