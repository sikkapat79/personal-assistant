import type { ToolDefinition } from '../ports/ILLMPort';
import { TODO_PRIORITIES } from '../../domain/entities/Todo';

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'get_logs',
    description:
      'Get journal/diary log entries for a date range (one entry per day). Not for tasks. Params: from (YYYY-MM-DD), to (YYYY-MM-DD).',
    parameters: {
      type: 'object',
      properties: { from: { type: 'string' }, to: { type: 'string' } },
      required: ['from', 'to'],
    },
  },
  {
    name: 'apply_log_update',
    description:
      'Create or update the daily log for a date. Use this for all log writes. Three modes: (1) create: when no log exists; requires sleep_notes (or notes), mood, energy. Ask user only for sleep and mood; derive energy from daily check-in (sleep, mood, yesterday\'s overview via get_logs)—do not ask user for energy. For create: use the user\'s exact words for sleep_notes; do not invent or elaborate. Derive energy only from stated sleep and mood (simple mapping); do not fabricate. Optional title: base only on what they said. (2) single_field: when log exists and user mentioned one thing; requires field and value. (3) summarize: when log exists and user asks for end-of-day summary; requires score, title, went_well, improve, gratitude, tomorrow, energy. If no log exists, single_field and summarize return an error: create first with mode create.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        mode: { type: 'string', enum: ['create', 'single_field', 'summarize'] },
        sleep_notes: { type: 'string' },
        notes: { type: 'string' },
        mood: { type: 'number' },
        energy: { type: 'number' },
        title: { type: 'string' },
        field: { type: 'string' },
        value: {},
        score: { type: 'number' },
        went_well: { type: 'string' },
        improve: { type: 'string' },
        gratitude: { type: 'string' },
        tomorrow: { type: 'string' },
      },
      required: ['date', 'mode'],
    },
  },
  {
    name: 'upsert_log',
    description:
      'Create or update the daily journal for a date (one entry per day). Every field is meaningful—only send the field(s) the user mentioned; all other fields are preserved (e.g. "I did a workout" → set only workout: true; "worked 3 hours" → set only deep_work_hours: 3). Set a short, cool title when creating the first log for that day (e.g. from sleep/mood: "Good sleep · calm start"); when summarizing (end of day or user asks), you MUST call upsert_log with that date and ALL of: title, score, went_well, improve, gratitude, tomorrow, and energy if inferred; do not skip any of these fields. Params: date (YYYY-MM-DD), title, notes, score (1–10), mood (1–5), energy (1–10 = energy budget for that day; use yesterday’s overview via get_logs as one input when setting today’s budget), deep_work_hours (number), workout (boolean), diet (boolean), reading_mins (number), went_well, improve, gratitude, tomorrow. Gratitude: capture what the user said; do not reinterpret. Tomorrow: reprioritize from open tasks and recommend what to do next.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        title: { type: 'string' },
        notes: { type: 'string' },
        score: { type: 'number' },
        mood: { type: 'number' },
        energy: { type: 'number' },
        deep_work_hours: { type: 'number' },
        workout: { type: 'boolean' },
        diet: { type: 'boolean' },
        reading_mins: { type: 'number' },
        went_well: { type: 'string' },
        improve: { type: 'string' },
        gratitude: { type: 'string' },
        tomorrow: { type: 'string' },
      },
      required: ['date'],
    },
  },
  {
    name: 'list_todos',
    description:
      'List tasks (open only, or all if include_done is true). When summarizing a day, pass for_date (YYYY-MM-DD) with include_done: true to get only tasks due that day (done and undone) so you can analyze them before summarizing.',
    parameters: {
      type: 'object',
      properties: {
        include_done: { type: 'boolean' },
        for_date: { type: 'string', description: 'Optional. When set, return only tasks due on this date (YYYY-MM-DD). Use when summarizing to load that day\'s tasks.' },
      },
    },
  },
  {
    name: 'add_todo',
    description:
      'Add a single task. Always set category (Work, Health, Personal, Learning); infer from context if user does not say. Add notes when the user gives context or something to remember. Params: title, category (required), due_date (optional, YYYY-MM-DD), notes (optional), priority (optional: High, Medium, Low).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string', enum: ['Work', 'Health', 'Personal', 'Learning'] },
        due_date: { type: 'string' },
        notes: { type: 'string' },
        priority: { type: 'string', enum: [...TODO_PRIORITIES] },
      },
      required: ['title', 'category'],
    },
  },
  {
    name: 'add_todos',
    description:
      'Add multiple tasks in one call. Every task must have a category (Work, Health, Personal, Learning); add notes when the user gives context or reminders. Params: tasks (array of { title, category, due_date?, notes?, priority? }). After adding, confirm how many tasks you added.',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              category: { type: 'string', enum: ['Work', 'Health', 'Personal', 'Learning'] },
              due_date: { type: 'string' },
              notes: { type: 'string' },
              priority: { type: 'string', enum: [...TODO_PRIORITIES] },
            },
            required: ['title', 'category'],
          },
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'update_todo',
    description:
      'Update an existing task by id or 1-based index. Call this when the user asks to change a task\'s priority, due date, title, category, or notes (e.g. "set task 1 to high priority", "change priority of the first todo to Medium"). Only include the field(s) to change. Params: id_or_index (required; use 1-based index from list_todos, e.g. "1" for first task), title (optional), category (optional), due_date (optional, YYYY-MM-DD or empty to clear), notes (optional), priority (optional: High, Medium, Low).',
    parameters: {
      type: 'object',
      properties: {
        id_or_index: { type: 'string' },
        title: { type: 'string' },
        category: { type: 'string', enum: ['Work', 'Health', 'Personal', 'Learning'] },
        due_date: { type: 'string' },
        notes: { type: 'string' },
        priority: { type: 'string', enum: [...TODO_PRIORITIES] },
      },
      required: ['id_or_index'],
    },
  },
  {
    name: 'delete_todo',
    description:
      'Delete (remove) a task by id or 1-based index. Before calling: confirm with the user by stating the task title (e.g. "Do you want to delete the task \'Buy milk\'?"). Only call after they confirm. Params: id_or_index (string).',
    parameters: {
      type: 'object',
      properties: { id_or_index: { type: 'string' } },
      required: ['id_or_index'],
    },
  },
  {
    name: 'complete_todo',
    description: 'Mark a task done by id or 1-based index. Params: id_or_index (string).',
    parameters: {
      type: 'object',
      properties: { id_or_index: { type: 'string' } },
      required: ['id_or_index'],
    },
  },
];
