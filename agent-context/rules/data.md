# Data: every field is meaningful

All log and task fields are meaningful. Preserve existing data; only change what the user asked for or what a procedure requires.

---

## Updating logs (read this first to avoid bugs)

There are **three distinct modes**. Use the right one every time. **Create first, then update:** if no log exists for that date, you must create it (Mode 0) before using single-field (Mode 1) or summarize (Mode 2).

### Mode 0: Create (no log yet)

**When:** `get_logs` shows no log for that date. Do **not** use single_field or summarize until the log exists.

**What to do:**
1. Only when the user is starting their day or asking to create today's log: ask for **sleeping record** (how they slept) and **waking-up mood** (1–5). Do **not** ask for energy budget. Do not ask for sleep/mood in every reply—only when creating or opening today's log.
2. Derive **energy budget** from the daily check-in: use their sleep (notes), waking mood, and optionally yesterday's overview (`get_logs` for yesterday—score, deep work hours, workout) to set energy (1–100). Do not ask the user for energy; it comes from daily check-in.
3. Call `apply_log_update` with `mode: "create"` and: `date`, `sleep_notes` (or `notes`), `mood`, `energy` (the value you derived). Optional: `title` (e.g. "Good sleep · calm start").
4. Only after the log is created may you use single_field or summarize for that date.

**New logs must include at least:** sleeping record (in notes), waking-up mood (mood), energy budget (energy). Energy is **not** asked from the user—derive it from daily check-in (sleep + mood + yesterday).

### Mode 1: Single-field update (most of the time)

**When:** A log already exists for that date, and the user mentions one thing about their day (e.g. "I did a workout", "worked 5 hours", "mood is 4").

**What to do:** Call `apply_log_update` with `mode: "single_field"`, `date`, `field`, and `value`. Do not send any other field.

- Examples:
  - "I did a workout" → `{ mode: "single_field", date: "YYYY-MM-DD", field: "workout", value: true }`
  - "Worked 3 hours deep" → `{ mode: "single_field", date: "YYYY-MM-DD", field: "deep_work_hours", value: 3 }`
  - "Mood 4" → `{ mode: "single_field", date: "YYYY-MM-DD", field: "mood", value: 4 }`

If there is no log for that date, the tool will return an error: create first (Mode 0) with sleep, mood, energy.

**Why:** Other fields are preserved. One intent = one field in the call.

### Mode 2: Summarize (end of day or user asks to summarize)

**When:** A log already exists for that date, and the user says they're wrapping up the day or asks for a summary.

**What to do:** First, select all undone and done tasks for that specific day: call `list_todos` with `include_done: true` and `for_date: <that date>` (YYYY-MM-DD). Use that list to analyze and fill the summary fields. Then call `apply_log_update` with `mode: "summarize"` and **all** of: `date`, `score`, `title`, `went_well`, `improve`, `gratitude`, `tomorrow`, `energy`. Optional: `notes` (short overall line). Do not skip any required field.

Then in your **reply**: give the short overall line and list **done & undone tasks for that day** (from the `list_todos` result above).

If there is no log for that date, the tool will return an error: create first (Mode 0) with sleep, mood, energy.

---

## Updating tasks (priority, due date, title, etc.)

**When:** The user asks to change an existing task's priority, due date, title, category, notes, or status (e.g. "set task 1 to high priority", "start task 2", "change the first todo to Medium", "make task 2 due tomorrow").

**What to do:** Call **update_todo** with `id_or_index` (1-based index: "1" = first open task, "2" = second, etc.) and **only** the field(s) to change (e.g. `priority: "High"`, `due_date: "YYYY-MM-DD"`, `status: "In Progress"`). Listing tasks with `list_todos` does **not** update anything—you must call **update_todo** to apply the change.

- Examples:
  - "Set task 1 to high priority" → `update_todo` with `id_or_index: "1"`, `priority: "High"`.
  - "Change the first todo's priority to Medium" → `update_todo` with `id_or_index: "1"`, `priority: "Medium"`.

---

## Other rules

- **Preserve existing data.** Only update the field(s) the user mentioned or the procedure requires. Never clear or overwrite other fields.
- **Tasks:** Same idea. `update_todo`: only include the property they asked to change.
- **First log of the day:** When creating (Mode 0), set a short, cool title (e.g. from sleep/mood: "Good sleep · calm start", "Morning focus").
- **Energy budget:** The `energy` field is the energy budget for that day (1–100). Do not ask the user for it. It comes from **daily check-in**: derive from sleep (notes), waking mood, and optionally yesterday's overview (`get_logs` for yesterday). When updating energy later, use yesterday's overview as one input.
- **No log for today:** If there is no log for today, ask the user for a **daily check-in** (sleep and mood). Do not ask for energy; derive it and create the log (Mode 0). Do **not** append a check-in question to every reply—only when there is no log for today or they ask to create or open today's log.

See `docs/journal-and-tasks.md` for the full field list and reference.
