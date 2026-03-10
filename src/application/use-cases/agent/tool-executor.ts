import type { ILogsRepository } from '../../ports/logs-repository';
import type { ITodosRepository } from '../../ports/todos-repository';
import type { IMetadataStore } from '../../ports/metadata-store';
import type { TodoStatus } from '../../../domain/entities/todo';
import { LogUseCase } from '../log-use-case';
import { TodosUseCase } from '../todos-use-case';
import type { ToolCall } from './tool-call';
import { parsePriority } from './parse-priority';
import { parseCategory } from './parse-category';
import { parseStatus } from './parse-status';
import { parseSingleFieldValue } from './parse-single-field-value';

export interface ToolDeps {
  logs: ILogsRepository;
  todos: ITodosRepository;
  metadataStore: IMetadataStore;
}

export async function executeTools(
  calls: ToolCall[],
  deps: ToolDeps
): Promise<{ name: string; result: string }[]> {
  const logUseCase = new LogUseCase(deps.logs);
  const todosUseCase = new TodosUseCase(deps.todos);
  const out: { name: string; result: string }[] = [];
  for (const call of calls) {
    try {
      const result = await executeOne(call, deps, logUseCase, todosUseCase);
      out.push({ name: call.name, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      out.push({ name: call.name, result: 'Error: ' + msg });
    }
  }
  return out;
}

async function executeOne(
  call: ToolCall,
  deps: ToolDeps,
  logUseCase: LogUseCase,
  todosUseCase: TodosUseCase
): Promise<string> {
  const { name, args } = call;
  switch (name) {
    case 'get_logs': {
      const from = String(args.from ?? '');
      const to = String(args.to ?? '');
      const list = await deps.logs.findByDateRange(from, to);
      if (list.length === 0) {
        return `No log entries between ${from} and ${to}.`;
      }
      const lines = list.map(
        (l) => `- ${l.date}: ${l.content.title || 'Untitled'}${l.content.notes ? ' — ' + (l.content.notes.slice(0, 80) + (l.content.notes.length > 80 ? '…' : '')) : ''}`
      );
      return `Found ${list.length} log entr${list.length === 1 ? 'y' : 'ies'} from ${from} to ${to}:\n${lines.join('\n')}`;
    }
    case 'apply_log_update': {
      const date = String(args.date ?? '');
      const mode = String(args.mode ?? '');
      const existing = await deps.logs.findByDate(date);
      if (mode === 'create') {
        if (existing) {
          return 'Error: Log already exists for this date. Use single_field or summarize instead.';
        }
        const sleepNotes =
          args.sleep_notes !== undefined && String(args.sleep_notes).trim() !== ''
            ? String(args.sleep_notes).trim()
            : args.notes !== undefined && String(args.notes).trim() !== ''
              ? String(args.notes).trim()
              : undefined;
        const mood = typeof args.mood === 'number' && Number.isFinite(args.mood) ? args.mood : undefined;
        const energy = typeof args.energy === 'number' && Number.isFinite(args.energy) ? args.energy : undefined;
        if (!sleepNotes || mood === undefined || energy === undefined) {
          const missing: string[] = [];
          if (!sleepNotes) missing.push('sleeping record (sleep_notes or notes)');
          if (mood === undefined) missing.push('mood');
          if (energy === undefined) missing.push('energy budget');
          return `Error: Create requires ${missing.join(', ')}.`;
        }
        const sleepMins = typeof args.sleep_mins === 'number' && Number.isFinite(args.sleep_mins) ? Math.round(args.sleep_mins) : undefined;
        const title = args.title !== undefined && String(args.title).trim() !== '' ? String(args.title).trim() : undefined;
        const result = await logUseCase.upsert({ date, title, sleepNotes, sleepMins, mood, energy });
        return result.created
          ? `Created log for ${date}${title ? `: "${title}"` : ''} with sleep, mood, energy.`
          : `Updated log for ${date}.`;
      }
      if (mode === 'single_field') {
        if (!existing) {
          return 'Error: No log for this date. Create it first (sleep, mood, energy) using mode create.';
        }
        const field = String(args.field ?? '').trim();
        const rawValue = args.value;
        if (!field) return 'Error: single_field requires field and value.';
        const parsed = parseSingleFieldValue(field, rawValue);
        if (parsed === undefined) {
          return `Error: Unknown or unsupported field "${field}" or invalid value.`;
        }
        await logUseCase.upsert({ date, ...parsed });
        return `Updated ${field} for ${date}.`;
      }
      if (mode === 'summarize') {
        if (!existing) {
          return 'Error: No log for this date. Create it first (sleep, mood, energy) using mode create.';
        }
        const score = typeof args.score === 'number' && Number.isFinite(args.score) ? args.score : undefined;
        const title = args.title !== undefined && String(args.title).trim() !== '' ? String(args.title).trim() : undefined;
        const wentWell = args.went_well !== undefined && args.went_well !== '' ? String(args.went_well) : undefined;
        const improve = args.improve !== undefined && args.improve !== '' ? String(args.improve) : undefined;
        const gratitude = args.gratitude !== undefined && args.gratitude !== '' ? String(args.gratitude) : undefined;
        const tomorrow = args.tomorrow !== undefined && args.tomorrow !== '' ? String(args.tomorrow) : undefined;
        const energy = typeof args.energy === 'number' && Number.isFinite(args.energy) ? args.energy : undefined;
        if (score === undefined || !title || !wentWell || !improve || !gratitude || !tomorrow || energy === undefined) {
          const missing: string[] = [];
          if (score === undefined) missing.push('score');
          if (!title) missing.push('title');
          if (!wentWell) missing.push('went_well');
          if (!improve) missing.push('improve');
          if (!gratitude) missing.push('gratitude');
          if (!tomorrow) missing.push('tomorrow');
          if (energy === undefined) missing.push('energy');
          return `Error: Summarize requires all of: ${missing.join(', ')}.`;
        }
        const notes = args.notes !== undefined && String(args.notes).trim() !== '' ? String(args.notes).trim() : undefined;
        await logUseCase.upsert({ date, score, title, wentWell, improve, gratitude, tomorrow, energy, notes });
        return `Summarized log for ${date}: "${title}".`;
      }
      return `Error: Unknown mode "${mode}". Use create, single_field, or summarize.`;
    }
    case 'upsert_log': {
      const date = String(args.date ?? '');
      const title = args.title !== undefined && args.title !== '' ? String(args.title) : undefined;
      const notes = args.notes !== undefined && args.notes !== '' ? String(args.notes) : undefined;
      const score = typeof args.score === 'number' && Number.isFinite(args.score) ? args.score : undefined;
      const mood = typeof args.mood === 'number' && Number.isFinite(args.mood) ? args.mood : undefined;
      const energy = typeof args.energy === 'number' && Number.isFinite(args.energy) ? args.energy : undefined;
      const deepWorkHours =
        typeof args.deep_work_hours === 'number' && Number.isFinite(args.deep_work_hours)
          ? args.deep_work_hours
          : undefined;
      const workout = typeof args.workout === 'boolean' ? args.workout : undefined;
      const diet = typeof args.diet === 'boolean' ? args.diet : undefined;
      const readingMins =
        typeof args.reading_mins === 'number' && Number.isFinite(args.reading_mins) ? args.reading_mins : undefined;
      const wentWell = args.went_well !== undefined && args.went_well !== '' ? String(args.went_well) : undefined;
      const improve = args.improve !== undefined && args.improve !== '' ? String(args.improve) : undefined;
      const gratitude = args.gratitude !== undefined && args.gratitude !== '' ? String(args.gratitude) : undefined;
      const tomorrow = args.tomorrow !== undefined && args.tomorrow !== '' ? String(args.tomorrow) : undefined;
      const result = await logUseCase.upsert({
        date, title, notes, score, mood, energy, deepWorkHours, workout, diet,
        readingMins, wentWell, improve, gratitude, tomorrow,
      });
      return result.created
        ? `Created a new log for ${date}${title ? `: "${title}"` : ''}.`
        : `Updated the log for ${date}${title ? `: "${title}"` : ''}.`;
    }
    case 'list_todos': {
      let list = args.include_done ? await todosUseCase.listAll() : await todosUseCase.listOpen();
      const forDate = typeof args.for_date === 'string' && args.for_date.trim() !== '' ? args.for_date.trim() : null;
      if (forDate) {
        list = list.filter((t) => t.dueDate === forDate);
      }
      if (list.length === 0) {
        if (forDate) {
          return args.include_done
            ? `No tasks due on ${forDate} (done or open).`
            : `No open tasks due on ${forDate}.`;
        }
        return args.include_done ? 'No TODOs in the list.' : 'No open tasks.';
      }
      const lines = list.map((t, i) => {
        const due = t.dueDate ? ` (due ${t.dueDate})` : '';
        const cat = t.category ? ` [${t.category}]` : '';
        const pri = t.priority ? ` [${t.priority}]` : '';
        const notesHint = t.notes ? ` — ${t.notes.slice(0, 40)}${t.notes.length > 40 ? '…' : ''}` : '';
        const status = args.include_done ? ` [${t.status}]` : '';
        return `${i + 1}. ${t.title}${due}${cat}${pri}${notesHint}${status}`;
      });
      const kind = args.include_done ? 'tasks' : 'open tasks';
      const scope = forDate ? ` due on ${forDate}` : '';
      return `${list.length} ${kind}${scope}:\n${lines.join('\n')}`;
    }
    case 'add_todo': {
      const title = String(args.title ?? '');
      const category = parseCategory(args.category);
      const dueDate = args.due_date ? String(args.due_date) : null;
      const notes = args.notes !== undefined && args.notes !== '' ? String(args.notes) : undefined;
      const priority = parsePriority(args.priority);
      const status = parseStatus(args.status);
      await todosUseCase.add({ title, category, dueDate, notes, priority, status });
      const parts = [`Added "${title}" [${category}]`];
      if (status !== 'Todo') parts.push(status);
      if (dueDate) parts.push(`due ${dueDate}`);
      if (notes) parts.push('with notes');
      if (priority) parts.push(priority);
      return parts.join(', ') + '.';
    }
    case 'add_todos': {
      const raw = args.tasks;
      const tasks = Array.isArray(raw) ? raw : [];
      const results: string[] = [];
      for (const t of tasks) {
        if (t && typeof t === 'object' && 'title' in t) {
          const title = String((t as { title?: unknown }).title ?? '');
          const category = parseCategory((t as { category?: unknown }).category);
          const dueDate = (t as { due_date?: unknown }).due_date
            ? String((t as { due_date: unknown }).due_date)
            : null;
          const notes = (t as { notes?: unknown }).notes !== undefined && (t as { notes: unknown }).notes !== ''
            ? String((t as { notes: unknown }).notes)
            : undefined;
          const priority = parsePriority((t as { priority?: unknown }).priority);
          const status = parseStatus((t as { status?: unknown }).status);
          if (title) {
            await todosUseCase.add({ title, category, dueDate, notes, priority, status });
            const extra: string[] = [];
            if (status !== 'Todo') extra.push(status);
            if (dueDate) extra.push(`due ${dueDate}`);
            if (notes) extra.push('notes');
            if (priority) extra.push(priority);
            results.push(extra.length ? `"${title}" [${category}] (${extra.join(', ')})` : `"${title}" [${category}]`);
          }
        }
      }
      if (results.length === 0) return 'No valid tasks to add.';
      return `Added ${results.length} task${results.length === 1 ? '' : 's'}: ${results.join(', ')}.`;
    }
    case 'update_todo': {
      const idOrIndex = String(args.id_or_index ?? '');
      const patch: {
        title?: string;
        category?: ReturnType<typeof parseCategory>;
        dueDate?: string | null;
        notes?: string;
        priority?: ReturnType<typeof parsePriority>;
        status?: TodoStatus;
      } = {};
      if (args.title !== undefined && args.title !== '') patch.title = String(args.title);
      if (args.category !== undefined) patch.category = parseCategory(args.category);
      if (args.due_date !== undefined) patch.dueDate = args.due_date === '' ? null : String(args.due_date);
      if (args.notes !== undefined) patch.notes = String(args.notes);
      if (args.priority !== undefined) patch.priority = parsePriority(args.priority);
      if (args.status !== undefined) patch.status = parseStatus(args.status);
      if (Object.keys(patch).length === 0) return 'No changes given for that task.';
      await todosUseCase.updateByIdOrIndex(idOrIndex, patch);
      const parts = ['Updated that task'];
      if (patch.title) parts.push(`title to "${patch.title}"`);
      if (patch.category) parts.push(`category ${patch.category}`);
      if (patch.dueDate !== undefined) parts.push(patch.dueDate ? `due ${patch.dueDate}` : 'cleared due date');
      if (patch.notes !== undefined) parts.push('notes');
      if (patch.priority) parts.push(`priority ${patch.priority}`);
      if (patch.status) parts.push(`status ${patch.status}`);
      return parts.join('; ') + '.';
    }
    case 'delete_todo': {
      const idOrIndex = String(args.id_or_index ?? '');
      await todosUseCase.deleteByIdOrIndex(idOrIndex);
      return 'Deleted that task.';
    }
    case 'complete_todo': {
      const idOrIndex = String(args.id_or_index ?? '');
      await todosUseCase.completeByIdOrIndex(idOrIndex);
      return 'Marked that task as done.';
    }
    case 'get_schema': {
      const databaseId = String(args.database_id ?? '');
      const schema = await deps.metadataStore.getCachedSchema(databaseId);
      if (!schema) return `No cached schema for database ${databaseId}.`;
      const lines = schema.properties.map((p) => `- ${p.name} (${p.notionType})`);
      return `Properties for ${databaseId}:\n${lines.join('\n')}`;
    }
    default:
      return "That tool isn't available.";
  }
}
