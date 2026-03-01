import type { IEventQueue } from '../../../application/ports/event-queue';
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

  const [todos, logs] = await Promise.all([
    notionTodos.listAll(),
    notionLogs.findByDateRange(from, to),
  ]);

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
