import type { TodoCategory, TodoPriority, TodoStatus } from '../../domain/entities/todo';
import type { LogContent } from '../../domain/value-objects/log-content';

export enum EntityType {
  Todo = 'todo',
  DailyLog = 'daily_log',
}

export enum EventType {
  TodoCreated = 'todo.created',
  TodoUpdated = 'todo.updated',
  TodoCompleted = 'todo.completed',
  TodoDeleted = 'todo.deleted',
  DailyLogUpserted = 'daily_log.upserted',
}

export interface TodoCreatedPayload {
  title: string;
  dueDate: string | null;
  status: TodoStatus;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
}

export interface TodoUpdatedPayload {
  patch: {
    title?: string;
    dueDate?: string | null;
    status?: TodoStatus;
    category?: TodoCategory;
    notes?: string;
    priority?: TodoPriority;
  };
}

export type TodoCompletedPayload = Record<string, never>;

export type TodoDeletedPayload = Record<string, never>;

export type DailyLogUpsertedPayload = LogContent;

export type EventPayload =
  | TodoCreatedPayload
  | TodoUpdatedPayload
  | TodoCompletedPayload
  | TodoDeletedPayload
  | DailyLogUpsertedPayload;

export interface StoredEvent {
  id: string;
  entity_type: EntityType;
  /** Local UUID (pre-sync for todos) or Notion page id / date string. */
  entity_id: string;
  event_type: EventType;
  payload: EventPayload;
  /** ISO 8601 with milliseconds. new Date().toISOString() always produces ms precision in Bun/V8 — ORDER BY timestamp ASC relies on this being consistent across all events. */
  timestamp: string;
  device_id: string;
  synced: 0 | 1;
}

/** Maps local UUIDs to Notion page ids. Used to resolve pre-sync todo entity ids during flush. */
export class EntityIdMap {
  private readonly localToNotion: Map<string, string> = new Map();

  getNotionId(localId: string): string | undefined {
    return this.localToNotion.get(localId);
  }

  set(localId: string, notionId: string): void {
    this.localToNotion.set(localId, notionId);
  }

  has(localId: string): boolean {
    return this.localToNotion.has(localId);
  }
}
