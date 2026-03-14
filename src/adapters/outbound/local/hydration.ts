import type { IEventQueue } from '@app/shared/event-queue.port';
import type { DailyLog } from '@domain/log/daily-log';
import type { Todo } from '@domain/todo/todo';
import type { NotionLogsAdapter } from '../notion/logs-adapter';
import type { NotionTodosAdapter } from '../notion/todos-adapter';
import type { LocalProjection } from './local-projection';
import dayjs from 'dayjs';

const HYDRATION_LOOKBACK_DAYS = 90;

/**
 * Pulls open todos and the last 90 days of logs from Notion, saves them to the
 * local snapshot tables, then refreshes the in-memory projection.
 *
 * Uses listOpen() (not listAll()) so that the snapshot only contains tasks that
 * are genuinely open — this avoids a doneKind mismatch bug where listAll()
 * maps Done tasks as 'Todo' when the column is a select/status type rather
 * than a checkbox and NOTION_TODOS_DONE_VALUE is not configured.
 *
 * Called once at startup in the background — does not block the app from
 * becoming ready.
 */
export async function hydrateFromNotion(
  queue: IEventQueue,
  projection: LocalProjection,
  notionLogs: NotionLogsAdapter,
  notionTodos: NotionTodosAdapter
): Promise<void> {
  const from = dayjs().subtract(HYDRATION_LOOKBACK_DAYS, 'day').format('YYYY-MM-DD');
  const to = dayjs().format('YYYY-MM-DD');

  let todos: Todo[], logs: DailyLog[];
  try {
    [todos, logs] = await Promise.all([
      notionTodos.listOpen(),
      notionLogs.findByDateRange(from, to),
    ]);
  } catch (err) {
    console.error('[hydration] Failed to fetch from Notion:', err instanceof Error ? err.message : String(err));
    return; // App continues with existing local snapshot
  }

  await queue.saveSnapshot(todos, logs);

  // Fetch both snapshot and pending events before touching the projection.
  // loadFromSnapshot and applyAll must execute without any await between them —
  // an async gap would allow a concurrent write (via nudge → flush) to be cleared
  // by loadFromSnapshot and permanently lost from the projection.
  let snapshot: Awaited<ReturnType<typeof queue.loadSnapshot>>;
  let pendingEvents: Awaited<ReturnType<typeof queue.pendingSync>>;
  try {
    [snapshot, pendingEvents] = await Promise.all([
      queue.loadSnapshot(),
      queue.pendingSync(),
    ]);
  } catch (err) {
    console.error('[hydration] Failed to load snapshot/pending from queue:', err instanceof Error ? err.message : String(err));
    return; // Projection retains its current state; app continues normally
  }
  projection.loadFromSnapshot(snapshot);
  projection.applyAll(pendingEvents);
}
