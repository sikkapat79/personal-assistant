# Journal and tasks reference

**Context is the source of truth for log behaviour.** Use `apply_log_update` with the correct mode (create | single_field | summarize). **Create first:** if no log exists for that date, create it with at least sleep, mood, and energy before any other update.

---

## Create first and required fields when creating

- **Create first:** Before any single-field update or summarize for a date, ensure a log exists. If `get_logs` shows no log, use Mode 0 (create) with sleeping record, mood, and energy. Only then use single_field or summarize.
- **Required when creating a new log:** (1) **sleeping record** (notes / sleep_notes), (2) **waking-up mood** (mood 1–5), (3) **energy budget** (energy 1–100). Ask the user only for sleep and mood. **Energy is not asked from the user**—derive it from daily check-in (sleep, mood, and optionally yesterday's overview via `get_logs`).

---

## Log fields (all meaningful)

Field names and purposes here match the app's column mapping (see `notion-schema` in code); user and AI use the same semantics.

| Field          | Purpose |
|----------------|--------|
| date           | Log date (YYYY-MM-DD) |
| title          | Short, memorable. Set on first log; update again when summarizing. |
| notes          | Free-form notes; use for sleeping record on create. |
| score          | 1–10 for that day (e.g. when summarizing). |
| mood           | 1–5 (e.g. after waking). |
| energy         | Energy budget for that day (1–100). Use yesterday's overview as one input. |
| deep_work_hours| Hours in deep work. |
| workout        | Did user workout? (boolean). |
| diet           | Diet checkbox (boolean). |
| reading_mins   | Minutes spent reading. |
| went_well      | What went well (text). |
| improve        | What to improve (text). |
| gratitude      | Gratitude (capture user words). |
| tomorrow       | Recommended focus for next day (from tasks/context). |

**When calling apply_log_update:**  
- **create:** `date` + `sleep_notes` (or `notes`) + `mood` + `energy`; optional `title`.  
- **single_field:** `date` + `field` + `value` only. Log must already exist.  
- **summarize:** `date` + all of score, title, went_well, improve, gratitude, tomorrow, energy (and notes if useful). Log must already exist.

---

## On open: load that date only

When opening the app (TUI or today view), load only that specific date's log (today). If no log exists, ask the user (see below).

---

## No log for today

If there is no log entry for today, ask the user for a **daily check-in** (sleep and mood). Do not ask for energy; derive it and create the log (Mode 0). Do not append a check-in question to every reply—only when there is no log for today or they ask to create or open today's log.

**Do not hallucinate on create.** Use only what the user said: (1) **sleep_notes** = their exact words or a short paraphrase; do not add times, details, or interpretations they did not say. (2) **energy** = derive only from the sleep and mood they gave (e.g. good sleep + good mood → 60–80); if you did not fetch yesterday's log, use only sleep + mood. (3) **title** = base only on sleep and mood they stated; do not add phrases they did not imply.

---

## Titles

- **First log of the day (create):** Set a short, cool title (e.g. from sleep/mood: "Good sleep · calm start", "Morning focus").
- **After summarizing:** Update the log **title** to a short phrase that captures the day (e.g. "Solid Tuesday · 7/10", "Shipped the feature · 3 deep hours").

---

## Summary (end of day or user asks)

**Before summarizing:** Select all tasks for that specific day to analyze: call `list_todos` with `include_done: true` and `for_date: <that date>` (YYYY-MM-DD) to get all undone and done tasks due that day. Use that list to inform went_well, improve, tomorrow, and your reply.

Then follow **Mode 2** in `rules/data.md`: call `apply_log_update` with `mode: "summarize"` and **all** of: date, score, title, went_well, improve, gratitude, tomorrow, energy (and notes if useful). In your reply: short overall line + done & undone tasks for that day (from the list_todos result). The log must already exist (create first if not).

---

## Energy budget

**energy** = energy budget for that day (1–100). It is **not** asked from the user; it comes from **daily check-in**: derive from sleep (notes), waking mood, and optionally yesterday's overview (`get_logs` for yesterday—score, deep work hours, workout). When updating energy later, use yesterday's overview as one input.

---

## Tasks

Each task has a **status** (Todo, In Progress, Done)—the current state of that task. Use `update_todo` to change status (e.g. "start task 1" → status In Progress). Only include the fields to change (title, category, due_date, notes, priority, status). Never overwrite unspecified fields.
