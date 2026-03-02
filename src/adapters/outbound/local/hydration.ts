import type { IEventQueue } from '../../../application/ports/event-queue';
import type { DailyLog } from '../../../domain/entities/daily-log';
import type { Todo } from '../../../domain/entities/todo';
import type { NotionLogsAdapter } from '../notion/logs-adapter';
import type { NotionTodosAdapter } from '../notion/todos-adapter';
import type { LocalProjection } from './local-projection';
import dayjs from 'dayjs';

const HYDRATION_LOOKBACK_DAYS = 90;

/**
 * Pulls all todos and the last 90 days of logs from Notion, saves them to the
 * local snapshot tables, then refreshes the in-memory projection.
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
      notionTodos.listAll(),
      notionLogs.findByDateRange(from, to),
    ]);
  } catch (err) {
    console.error('[hydration] Failed to fetch from Notion:', err instanceof Error ? err.message : String(err));
    return; // App continues with existing local snapshot
  }

  queue.saveSnapshot(todos, logs);

  const snapshot = queue.loadSnapshot();
  // loadFromSnapshot and applyAll must stay synchronous with no await between them.
  // loadFromSnapshot clears the projection; applyAll re-applies pending local writes.
  // An await here would allow a concurrent write (via nudge → flush) to be cleared
  // by the subsequent loadFromSnapshot and permanently lost from the projection.
  projection.loadFromSnapshot(snapshot);
  const pendingEvents = queue.pendingSync();
  projection.applyAll(pendingEvents);
}
