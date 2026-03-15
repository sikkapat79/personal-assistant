import { eq, inArray, gte, asc, and, notInArray, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { join } from 'path';
import type { IEventQueue } from '@app/shared/event-queue.port';
import type { StoredEvent } from '@app/shared/event-types';
import { EntityIdMap, EventType } from '@app/shared/event-types';
import type { DailyLog } from '@domain/log/daily-log';
import type { Todo } from '@domain/todo/todo';
import type { TursoDb } from './client';
import { events, snapshotTodos, snapshotLogs, entityIdMap } from './schema';

export class TursoEventQueue implements IEventQueue {
  constructor(
    private readonly db: TursoDb,
    private readonly userId: string,
  ) {}

  /** Run Drizzle migrations. Must be called once at startup before any other method. */
  async initialize(): Promise<void> {
    await migrate(this.db, {
      migrationsFolder: join(import.meta.dirname, 'migrations'),
    });
  }

  async append(event: StoredEvent): Promise<void> {
    await this.db
      .insert(events)
      .values({
        id: event.id,
        entityType: event.entity_type,
        entityId: event.entity_id,
        eventType: event.event_type,
        payload: JSON.stringify(event.payload),
        timestamp: event.timestamp,
        deviceId: event.device_id,
        synced: event.synced,
        userId: this.userId,
      })
      .onConflictDoNothing();
  }

  async pendingSync(): Promise<StoredEvent[]> {
    const rows = await this.db
      .select()
      .from(events)
      .where(and(eq(events.synced, 0), eq(events.userId, this.userId)))
      .orderBy(asc(events.id));
    return rows.map(rowToStoredEvent);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(events)
      .set({ synced: 1 })
      .where(and(inArray(events.id, ids), eq(events.userId, this.userId)));
  }

  async loadSnapshot(): Promise<{ todos: Todo[]; logs: DailyLog[] }> {
    const [todoRows, logRows] = await Promise.all([
      this.db.select().from(snapshotTodos).where(eq(snapshotTodos.userId, this.userId)),
      this.db.select().from(snapshotLogs).where(eq(snapshotLogs.userId, this.userId)),
    ]);
    return {
      todos: todoRows.map((row) => JSON.parse(row.data) as Todo),
      logs: logRows.map((row) => JSON.parse(row.data) as DailyLog),
    };
  }

  async saveSnapshot(todos: Todo[], logs: DailyLog[]): Promise<void> {
    const now = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      if (todos.length > 0) {
        const todoRows = todos.map((todo) => {
          if (!todo.id) throw new Error('Snapshot received a todo with no id — invariant violation');
          return { notionId: todo.id, data: JSON.stringify(todo), fetchedAt: now, userId: this.userId };
        });
        await tx
          .insert(snapshotTodos)
          .values(todoRows)
          .onConflictDoUpdate({
            target: [snapshotTodos.userId, snapshotTodos.notionId],
            set: { data: sql`excluded.data`, fetchedAt: sql`excluded.fetched_at` },
          });
      }

      if (logs.length > 0) {
        const logRows = logs.map((log) => ({
          date: log.date,
          data: JSON.stringify(log),
          fetchedAt: now,
          userId: this.userId,
        }));
        await tx
          .insert(snapshotLogs)
          .values(logRows)
          .onConflictDoUpdate({
            target: [snapshotLogs.userId, snapshotLogs.date],
            set: { data: sql`excluded.data`, fetchedAt: sql`excluded.fetched_at` },
          });
      }

      // Prune rows that no longer exist in Notion — scoped to this user only
      if (todos.length === 0) {
        await tx.delete(snapshotTodos).where(eq(snapshotTodos.userId, this.userId));
      } else {
        const ids = todos.map((t) => t.id!);
        await tx
          .delete(snapshotTodos)
          .where(and(eq(snapshotTodos.userId, this.userId), notInArray(snapshotTodos.notionId, ids)));
      }

      if (logs.length === 0) {
        await tx.delete(snapshotLogs).where(eq(snapshotLogs.userId, this.userId));
      } else {
        const dates = logs.map((l) => l.date);
        await tx
          .delete(snapshotLogs)
          .where(and(eq(snapshotLogs.userId, this.userId), notInArray(snapshotLogs.date, dates)));
      }
    });
  }

  async upsertSnapshotLog(log: DailyLog): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insert(snapshotLogs)
      .values({ date: log.date, data: JSON.stringify(log), fetchedAt: now, userId: this.userId })
      .onConflictDoUpdate({
        target: [snapshotLogs.userId, snapshotLogs.date],
        set: { data: JSON.stringify(log), fetchedAt: now },
      });
  }

  async getEntityIdMap(): Promise<EntityIdMap> {
    const rows = await this.db
      .select()
      .from(entityIdMap)
      .where(eq(entityIdMap.userId, this.userId));
    const map = new EntityIdMap();
    for (const row of rows) {
      map.set(row.localId, row.notionId);
    }
    return map;
  }

  async persistEntityIdMapping(localId: string, notionId: string): Promise<void> {
    await this.db
      .insert(entityIdMap)
      .values({ localId, notionId, userId: this.userId })
      .onConflictDoUpdate({
        target: [entityIdMap.userId, entityIdMap.localId],
        set: { notionId },
      });
  }

  async listCompletedTodayIds(sinceUtc: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ entityId: events.entityId })
      .from(events)
      .where(
        and(
          eq(events.eventType, EventType.TodoCompleted),
          gte(events.timestamp, sinceUtc),
          eq(events.userId, this.userId),
        )
      );
    return rows.map((r) => r.entityId);
  }

  async getEventsForEntity(entityId: string): Promise<StoredEvent[]> {
    const rows = await this.db
      .select()
      .from(events)
      .where(and(eq(events.entityId, entityId), eq(events.userId, this.userId)))
      .orderBy(asc(events.id));
    return rows.map(rowToStoredEvent);
  }
}

function rowToStoredEvent(row: {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  payload: string;
  timestamp: string;
  deviceId: string;
  synced: number;
}): StoredEvent {
  return {
    id: row.id,
    entity_type: row.entityType as StoredEvent['entity_type'],
    entity_id: row.entityId,
    event_type: row.eventType as StoredEvent['event_type'],
    payload: JSON.parse(row.payload) as StoredEvent['payload'],
    timestamp: row.timestamp,
    device_id: row.deviceId,
    synced: row.synced as 0 | 1,
  };
}
