import type { DailyLog } from '@domain/log/daily-log';
import type { Todo } from '@domain/todo/todo';
import type { StoredEvent, EntityIdMap } from './event-types';

export type { StoredEvent, EntityIdMap } from './event-types';

export interface IEventQueue {
  append(event: StoredEvent): Promise<void>;
  pendingSync(): Promise<StoredEvent[]>;
  markSynced(ids: string[]): Promise<void>;
  loadSnapshot(): Promise<{ todos: Todo[]; logs: DailyLog[] }>;
  saveSnapshot(todos: Todo[], logs: DailyLog[]): Promise<void>;
  /** Write-through: upsert a single log into snapshot_logs without pruning other rows. */
  upsertSnapshotLog(log: DailyLog): Promise<void>;
  getEntityIdMap(): Promise<EntityIdMap>;
  persistEntityIdMapping(localId: string, notionId: string): Promise<void>;
  /** Returns entity_ids of todos completed since the given UTC timestamp (start of local today). */
  listCompletedTodayIds(sinceUtc: string): Promise<string[]>;
  /** Returns all events for a given entity_id, ordered by id ASC. */
  getEventsForEntity(entityId: string): Promise<StoredEvent[]>;
}
