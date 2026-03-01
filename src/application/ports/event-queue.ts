import type { DailyLog } from '../../domain/entities/daily-log';
import type { Todo } from '../../domain/entities/todo';
import type { StoredEvent, EntityIdMap } from './event-types';

export type { StoredEvent, EntityIdMap } from './event-types';

export interface IEventQueue {
  append(event: StoredEvent): void;
  pendingSync(): StoredEvent[];
  markSynced(ids: string[]): void;
  loadSnapshot(): { todos: Todo[]; logs: DailyLog[] };
  saveSnapshot(todos: Todo[], logs: DailyLog[]): void;
  getEntityIdMap(): EntityIdMap;
  persistEntityIdMapping(localId: string, notionId: string): void;
}
