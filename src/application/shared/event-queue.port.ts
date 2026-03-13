import type { DailyLog } from '@domain/log/daily-log';
import type { Todo } from '@domain/todo/todo';
import type { StoredEvent, EntityIdMap } from './event-types';

export type { StoredEvent, EntityIdMap } from './event-types';

export interface IEventQueue {
  append(event: StoredEvent): void;
  pendingSync(): StoredEvent[];
  markSynced(ids: string[]): void;
  loadSnapshot(): { todos: Todo[]; logs: DailyLog[] };
  saveSnapshot(todos: Todo[], logs: DailyLog[]): void;
  /** Write-through: upsert a single log into snapshot_logs without pruning other rows. */
  upsertSnapshotLog(log: DailyLog): void;
  getEntityIdMap(): EntityIdMap;
  persistEntityIdMapping(localId: string, notionId: string): void;
  /** Returns entity_ids of todos completed on the given date (format: YYYY-MM-DD). */
  listCompletedTodayIds(todayDate: string): string[];
  /** Returns all events for a given entity_id, ordered by id ASC. */
  getEventsForEntity(entityId: string): StoredEvent[];
}
