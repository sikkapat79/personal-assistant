import type { ILogsRepository } from '../ports/logs-repository';
import type { ITodosRepository } from '../ports/todos-repository';
import type { IAgentContextPort } from '../ports/agent-context-port';
import type { ILLMPort, ChatMessage } from '../ports/llm-port';
import type { TodoPriority, TodoCategory, TodoStatus } from '../../domain/entities/todo';
import type { DailyLog } from '../../domain/entities/daily-log';
import type { Todo } from '../../domain/entities/todo';
import { TODO_PRIORITIES } from '../../domain/entities/todo';
import type { LogInputDto } from '../dto/log-dto';
import { AGENT_TOOLS } from '../dto/agent-tools';
import { AGENT_NAME } from '../../config/branding';
import { LogUseCase } from './log-use-case';
import { TodosUseCase } from './todos-use-case';

const VALID_CATEGORIES: TodoCategory[] = ['Work', 'Health', 'Personal', 'Learning'];
const DEFAULT_CATEGORY: TodoCategory = 'Personal';

/** Parses priority from tool/LLM input (case-insensitive); returns canonical TodoPriority or undefined. */
function parsePriority(value: unknown): TodoPriority | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  const match = TODO_PRIORITIES.find((p) => p.toLowerCase() === normalized.toLowerCase());
  return match ?? undefined;
}

function parseCategory(value: unknown): TodoCategory {
  if (typeof value !== 'string') return DEFAULT_CATEGORY;
  const c = value as TodoCategory;
  return VALID_CATEGORIES.includes(c) ? c : DEFAULT_CATEGORY;
}

const VALID_STATUSES: TodoStatus[] = ['Todo', 'In Progress', 'Done'];
function parseStatus(value: unknown): TodoStatus {
  if (typeof value !== 'string') return 'Todo';
  const s = value.trim();
  const match = VALID_STATUSES.find((x) => x.toLowerCase() === s.toLowerCase());
  return match ?? 'Todo';
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Map single_field (field name + value) to one key of LogInputDto for merge. */
function parseSingleFieldValue(
  field: string,
  rawValue: unknown
): Partial<Omit<LogInputDto, 'date'>> | undefined {
  const v = rawValue;
  const str = typeof v === 'string' ? v.trim().toLowerCase() : '';
  const num = typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  const bool =
    v === true || v === false ? v : str === 'true' ? true : str === 'false' ? false : undefined;
  switch (field) {
    case 'workout':
      return bool !== undefined ? { workout: bool } : undefined;
    case 'diet':
      return bool !== undefined ? { diet: bool } : undefined;
    case 'mood':
      return !Number.isNaN(num) && num >= 1 && num <= 5 ? { mood: Math.round(num) } : undefined;
    case 'energy':
      return !Number.isNaN(num) && num >= 1 && num <= 10 ? { energy: Math.round(num) } : undefined;
    case 'score':
      return !Number.isNaN(num) && num >= 1 && num <= 10 ? { score: Math.round(num) } : undefined;
    case 'deep_work_hours':
      return !Number.isNaN(num) && num >= 0 ? { deepWorkHours: num } : undefined;
    case 'reading_mins':
      return !Number.isNaN(num) && num >= 0 ? { readingMins: Math.round(num) } : undefined;
    case 'title':
      return typeof v === 'string' && v.trim() !== '' ? { title: v.trim() } : undefined;
    case 'notes':
      return v !== undefined && v !== null ? { notes: String(v).trim() || undefined } : undefined;
    default:
      return undefined;
  }
}

export class AgentUseCase {
  constructor(
    private readonly logs: ILogsRepository,
    private readonly todos: ITodosRepository,
    private readonly context: IAgentContextPort,
    private readonly llm: ILLMPort
  ) {}

  /** Reply that looks like raw tool-call output should never be shown to the user. */
  private static readonly RAW_TOOL_CALL_PATTERN = /^\s*TOOL_CALLS?:\s*[\s\S]*/i;

  private static readonly MAX_TOOL_ROUNDS = 5;

  /** Max recent messages to send in full; older messages are summarized when history exceeds this. */
  private static readonly MAX_RECENT_MESSAGES = 16;

  /** Length of the history prefix we have already summarized (cache is for history.slice(0, lastSummarizedIndex)). */
  private lastSummarizedIndex = 0;

  /** Cached summary for that prefix; null when cache is invalid. */
  private cachedSessionSummary: string | null = null;

  /**
   * Returns history to send to the LLM and an optional summary of older turns.
   * When history exceeds MAX_RECENT_MESSAGES, older part is summarized and only recent messages are kept.
   * Uses incremental caching: only new messages are summarized and merged with the cached summary.
   */
  private async buildEffectiveHistory(
    history: ChatMessage[]
  ): Promise<{ effectiveHistory: ChatMessage[]; sessionSummary: string | null }> {
    const recent = history.slice(-AgentUseCase.MAX_RECENT_MESSAGES);
    if (history.length <= AgentUseCase.MAX_RECENT_MESSAGES) {
      this.lastSummarizedIndex = 0;
      this.cachedSessionSummary = null;
      return { effectiveHistory: history, sessionSummary: null };
    }
    const L = history.length - AgentUseCase.MAX_RECENT_MESSAGES;
    if (L < this.lastSummarizedIndex) {
      this.lastSummarizedIndex = 0;
      this.cachedSessionSummary = null;
    }
    if (L === this.lastSummarizedIndex && this.cachedSessionSummary !== null) {
      return { effectiveHistory: recent, sessionSummary: this.cachedSessionSummary };
    }
    const oldPart = history.slice(0, L);
    let sessionSummary: string;
    if (this.lastSummarizedIndex === 0) {
      sessionSummary = await this.summarizeConversation(oldPart);
    } else {
      const newSlice = history.slice(this.lastSummarizedIndex, L);
      const newSummary = await this.summarizeConversation(newSlice);
      sessionSummary = `${this.cachedSessionSummary} ${newSummary}`.trim();
    }
    this.lastSummarizedIndex = L;
    this.cachedSessionSummary = sessionSummary;
    return { effectiveHistory: recent, sessionSummary };
  }

  /**
   * One LLM call (no tools) to summarize older conversation for context.
   */
  private async summarizeConversation(messages: ChatMessage[]): Promise<string> {
    const transcript = messages
      .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : ''}`)
      .join('\n');
    const summarizerMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Summarize this chat in 2–4 short sentences: what was decided, any tasks or todos added, and today\'s focus. Be concise.',
      },
      { role: 'user', content: transcript },
    ];
    const summary = await this.llm.chat(summarizerMessages);
    return (summary ?? '').trim() || 'Earlier conversation.';
  }

  async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
    const todayDate = new Date().toISOString().slice(0, 10);
    const [ctx, todayLog, openTodos] = await Promise.all([
      this.context.getContext(),
      this.logs.findByDate(todayDate),
      this.todos.listOpen(),
    ]);
    const currentState = buildCurrentStateSnapshot(todayDate, todayLog, openTodos);
    const systemPrompt = buildSystemPrompt(ctx, todayDate, currentState);
    const { effectiveHistory, sessionSummary } = await this.buildEffectiveHistory(history);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(sessionSummary
        ? [{ role: 'system' as const, content: `Earlier in this session: ${sessionSummary}` }]
        : []),
      ...effectiveHistory,
      { role: 'user', content: userMessage },
    ];
    let reply = await this.llm.chat(messages, AGENT_TOOLS);
    let rounds = 0;
    while (rounds < AgentUseCase.MAX_TOOL_ROUNDS) {
      const toolCalls = parseToolCalls(reply);
      if (toolCalls.length === 0) break;
      const results = await this.executeTools(toolCalls);
      const resultText = results.map((r) => `${r.name}: ${r.result}`).join('\n');
      messages.push({ role: 'assistant', content: reply });
      messages.push({
        role: 'user',
        content: `Tool results:\n${resultText}`,
      });
      reply = await this.llm.chat(messages, AGENT_TOOLS);
      rounds++;
    }
    if (reply && AgentUseCase.RAW_TOOL_CALL_PATTERN.test(reply.trim())) {
      reply = await this.llm.chat(messages);
    }
    if (!reply || AgentUseCase.RAW_TOOL_CALL_PATTERN.test(reply.trim())) {
      return "Done. I've taken care of that.";
    }
    return reply;
  }

  private async executeTools(calls: ToolCall[]): Promise<{ name: string; result: string }[]> {
    const logUseCase = new LogUseCase(this.logs);
    const todosUseCase = new TodosUseCase(this.todos);
    const out: { name: string; result: string }[] = [];
    for (const call of calls) {
      try {
        const result = await this.executeOne(call, logUseCase, todosUseCase);
        out.push({ name: call.name, result });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        out.push({ name: call.name, result: 'Error: ' + msg });
      }
    }
    return out;
  }

  private async executeOne(
    call: ToolCall,
    logUseCase: LogUseCase,
    todosUseCase: TodosUseCase
  ): Promise<string> {
    const { name, args } = call;
    switch (name) {
      case 'get_logs': {
        const from = String(args.from ?? '');
        const to = String(args.to ?? '');
        const list = await this.logs.findByDateRange(from, to);
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
        const existing = await this.logs.findByDate(date);
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
          const title = args.title !== undefined && String(args.title).trim() !== '' ? String(args.title).trim() : undefined;
          const result = await logUseCase.upsert({
            date,
            title,
            notes: sleepNotes,
            mood,
            energy,
          });
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
          if (
            score === undefined ||
            !title ||
            !wentWell ||
            !improve ||
            !gratitude ||
            !tomorrow ||
            energy === undefined
          ) {
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
          await logUseCase.upsert({
            date,
            score,
            title,
            wentWell,
            improve,
            gratitude,
            tomorrow,
            energy,
            notes,
          });
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
          date,
          title,
          notes,
          score,
          mood,
          energy,
          deepWorkHours,
          workout,
          diet,
          readingMins,
          wentWell,
          improve,
          gratitude,
          tomorrow,
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
      default:
        return "That tool isn't available.";
    }
  }
}

function buildCurrentStateSnapshot(todayDate: string, todayLog: DailyLog | null, openTodos: Todo[]): string {
  const lines: string[] = [];
  if (todayLog === null) {
    lines.push(`Today's log: none yet. (User has not created a log for ${todayDate}.)`);
  } else {
    const c = todayLog.content;
    const parts = ["Today's log: exists."];
    if (c.title) parts.push(`Title: "${c.title}"`);
    if (c.mood != null) parts.push(`mood ${c.mood}/5`);
    if (c.energy != null) parts.push(`energy ${c.energy}/10`);
    if (c.score != null) parts.push(`score ${c.score}/10`);
    lines.push(parts.join('. '));
  }
  if (openTodos.length === 0) {
    lines.push('Open tasks: none.');
  } else {
    const preview = openTodos.slice(0, 5).map((t, i) => `${i + 1}. ${t.title}`).join('; ');
    lines.push(`Open tasks: ${openTodos.length} (${preview}${openTodos.length > 5 ? '…' : ''}).`);
  }
  return lines.join('\n');
}

function buildSystemPrompt(
  ctx: { rules: string; docs: string[]; skills: string[] },
  todayDate: string,
  currentState: string
): string {
  const parts = [
    '## Persona',
    `You are ${AGENT_NAME}, a friendly, calm personal assistant—like a helpful friend who remembers their journal and tasks. Talk like a real person: warm and natural, not like a bot. Avoid stiff or robotic replies (e.g. "Task added.", "Done.", or repeating back exactly what they said). No canned phrases, bullet lists, or templates unless the user asks. Respond from the conversation and what you just did; keep it human and concise.`,
    '',
    '## Context',
    `Today's date is ${todayDate}. Use get_logs when you need full log text or other dates; the snapshot below is a quick view of today.`,
    '',
    '## Current state (use this to reason; call tools when you need to read or change data)',
    currentState,
    '',
    '## Data',
    'Every field in their logs and tasks is meaningful to them. Preserve existing data: only update the specific field(s) the user mentioned or provided; never clear or overwrite other fields. When summarizing or referring to their day, do not drop or ignore any field they care about (sleep, mood, score, workout, hours, tasks done/undone, etc.). For how to update logs without bugs (single-field vs summarize, which fields to send), follow the **Rules** and **Docs** below—they are the source of truth.',
    '',
    '## Your jobs',
    '1. **Tasks (to-do list)** – Each task has a **status**: Todo, In Progress, Done. Add, list, update, complete, and delete tasks. Use add_todo or add_todos (optional status: Todo, In Progress, Done), update_todo (can set status—e.g. "start task 1" → status In Progress), delete_todo, complete_todo (marks Done). Never put tasks in the journal. **When the user asks to change a task\'s priority, due date, title, category, notes, or status, you MUST call update_todo with id_or_index and the new value—calling only list_todos does not update the task.**',
    '2. **Journal (daily log)** – One log per calendar day. Use **apply_log_update** for all log writes (do not use upsert_log for journal updates). Three modes: **create** (when no log exists—requires sleep_notes, mood, energy; ask user only for sleep and mood; **derive energy from daily check-in** (sleep, mood, yesterday\'s overview), do not ask for energy); **single_field** (when log exists and user mentioned one thing—field + value only); **summarize** (when log exists and end of day or user asks—all of score, title, went_well, improve, gratitude, tomorrow, energy). If get_logs shows no log for that date, create first with mode create; only then use single_field or summarize. See **Rules** and **Docs** for the full procedure.',
    '3. **Task extraction** – You can extract as many tasks as the user mentions. Every task must have a category (Work, Health, Personal, Learning)—always set it; infer from context if the user does not say. Add due_date when they mention a date; add notes when they give context or something to remember about the task (notes help remind them). Set priority when they say it or infer from urgency. After adding, confirm how many tasks you added.',
    '4. **Delete task** – When the user wants to delete or remove a task, first identify it (e.g. by listing and matching title or index). Then ask for confirmation by stating the exact task title: "Do you want to delete the task \'…\'?" Only call delete_todo after they confirm (yes, please, etc.).',
    '5. **Summarize** – When user says they\'re wrapping up or asks for a summary, **first** load that day\'s tasks to analyze: call list_todos with include_done: true and for_date: <the log date> to get all tasks due that day (done and undone). Use that list to fill went_well, improve, tomorrow, and to report done & undone in your reply. Then call apply_log_update with mode summarize (log must already exist; create first if not) with all required fields. Gratitude: capture their words; tomorrow: your reprioritized recommendation from that day\'s tasks and context.',
    '6. **New day** – When they open the app or start chatting and there is no log for today, you can offer a brief line (e.g. today\'s focus or one-line yesterday) and help them get oriented; if no log for today, ask for a **daily check-in** (see 7).',
    '7. **No log for today** – If get_logs shows no log for today, ask the user for a **daily check-in** (sleep and mood). Do not ask for energy; derive it and call apply_log_update with mode create. Do **not** append a check-in question to every reply—only when there is no log for today or they ask to create today\'s log. When you call create, follow the **Daily check-in / create** rules below (use only what they said; no inventing).',
    '8. **Single-field and tasks** – When the user mentions only one log thing (e.g. "I did a workout", "worked 5 hours"), use apply_log_update with mode single_field and that field + value. Same for tasks: when they ask to change a task\'s priority, due date, title, category, notes, or status (Todo / In Progress / Done), call **update_todo** with id_or_index (e.g. "1" for first task) and only that field (e.g. priority: "High", or status: "In Progress" for "start task 1"). Do not only list tasks—call update_todo to apply the change.',
    '9. **Energy budget** – The energy field is the **energy budget for that day** (1–10). Do **not** ask the user for it. It comes from **daily check-in**: derive from sleep (notes), mood, and optionally yesterday\'s overview (get_logs for yesterday). When updating energy later, use yesterday\'s overview as one input.',
    '',
    '## Daily check-in / create (no hallucination)',
    'When calling apply_log_update with mode create (e.g. after step 7 above), use **only what the user said**. (1) **sleep_notes**: User\'s exact words or a short paraphrase; do not add details, times, or interpretations they did not say. (2) **energy**: Derive only from the sleep and mood they gave (e.g. good sleep + good mood → 6–8, poor sleep + low mood → 2–4); if you have no yesterday log, use only sleep + mood; do not invent context. (3) **title** (optional): Base only on sleep and mood they actually stated; do not add phrases they did not imply.',
    '',
    '## Responding',
    'Be friendly and conversational. Reply in full sentences, in your own words—as if you’re chatting, not filing a report. Match their tone and energy. After using tools, say something that fits the moment (e.g. a short acknowledgment, a follow-up question, or a light comment) instead of robotic confirmations or raw output. Only call tools when their intent is clear; when you change something (e.g. add a task, update the journal), mention it naturally in the flow of the reply.',
    '',
    '## Rules',
    ctx.rules,
  ];
  if (ctx.skills.length) parts.push('\n## Skills\n' + ctx.skills.join('\n'));
  if (ctx.docs.length) parts.push('\n## Docs (reference)\n' + ctx.docs.slice(0, 3).join('\n'));
  return parts.join('\n');
}

/** Parse human-readable TOOL_CALLS: [{"name":"...","args":{...}}] or TOOL_CALLS: {"name":"...","args":{...}}. Only when reply starts with TOOL_CALL(S): (same as RAW_TOOL_CALL_PATTERN). */
function parseToolCalls(reply: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const trimmed = reply.trim();
  const prefix = /^TOOL_CALLS?:\s*/i;
  const match = trimmed.match(prefix);
  if (!match?.[0]) return calls;
  const afterPrefix = trimmed.slice(match[0].length);
  const jsonStart = afterPrefix.search(/[\[{]/);
  if (jsonStart < 0) return calls;
  const open = afterPrefix[jsonStart] as '[' | '{';
  const close = open === '[' ? ']' : '}';
  let depth = 1;
  let end = jsonStart + 1;
  let inString = false;
  let escape = false;
  let quoteChar = '';
  for (; end < afterPrefix.length && depth > 0; end++) {
    const c = afterPrefix[end];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if ((c === '"' || c === "'") && !inString) {
      inString = true;
      quoteChar = c;
      continue;
    }
    if (c === quoteChar && inString) {
      inString = false;
      continue;
    }
    if (inString) continue;
    if (c === open) depth++;
    else if (c === close) depth--;
  }
  if (depth !== 0) return calls;
  const jsonStr = afterPrefix.slice(jsonStart, end);
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown> | Record<string, unknown>[];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of arr) {
      if (item && typeof item === 'object' && 'name' in item && 'args' in item) {
        calls.push({ name: String(item.name), args: (item.args as Record<string, unknown>) ?? {} });
      }
    }
  } catch {
    // ignore
  }
  return calls;
}
