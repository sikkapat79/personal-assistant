# Journal and tasks reference

**Context is the source of truth for log behaviour.** Use `apply_log_update` with the correct mode (create | single_field | summarize). **Create first:** if no log exists for that date, create it with at least sleep, mood, and energy before any other update.

---

## Create first and required fields when creating

- **Create first:** Before any single-field update or summarize for a date, ensure a log exists. If `get_logs` shows no log, use Mode 0 (create) with sleeping record, mood, and energy. Only then use single_field or summarize.
- **Required when creating a new log:** (1) **sleeping record** (notes / sleep_notes), (2) **waking-up mood** (mood 1–5), (3) **energy budget** (energy 1–10). Ask the user only for sleep and mood. **Energy is not asked from the user**—derive it from daily check-in (sleep, mood, and optionally yesterday's overview via `get_logs`).

---

## Log fields (all meaningful)

| Field          | Purpose |
|----------------|--------|
| date           | Log date (YYYY-MM-DD) |
| title          | Short, memorable. Set on first log; update again when summarizing. |
| notes          | Free-form notes; use for sleeping record on create. |
| score          | 1–10 for that day (e.g. when summarizing). |
| mood           | 1–5 (e.g. after waking). |
| energy         | Energy budget for that day (1–10). Use yesterday's overview as one input. |
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

If there is no log entry for today, ask only for **sleep** (how they slept) and **mood after they woke up**. Do not ask for energy budget; derive it from daily check-in (sleep, mood, yesterday's overview). Then create the log (Mode 0) with sleep, mood, and derived energy. Keep it brief.

---

## Titles

- **First log of the day (create):** Set a short, cool title (e.g. from sleep/mood: "Good sleep · calm start", "Morning focus").
- **After summarizing:** Update the log **title** to a short phrase that captures the day (e.g. "Solid Tuesday · 7/10", "Shipped the feature · 3 deep hours").

---

## Summary (end of day or user asks)

Follow **Mode 2** in `rules/data.md`: call `apply_log_update` with `mode: "summarize"` and **all** of: date, score, title, went_well, improve, gratitude, tomorrow, energy (and notes if useful). Then in your reply: short overall line + done & undone tasks (from `list_todos` with `include_done: true`). The log must already exist (create first if not).

---

## Energy budget

**energy** = energy budget for that day (1–10). It is **not** asked from the user; it comes from **daily check-in**: derive from sleep (notes), waking mood, and optionally yesterday's overview (`get_logs` for yesterday—score, deep work hours, workout). When updating energy later, use yesterday's overview as one input.

---

## Tasks

`update_todo`: only include the fields to change (title, category, due_date, notes, priority). Never overwrite unspecified fields.
