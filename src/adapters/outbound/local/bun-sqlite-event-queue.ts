import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

import type { IEventQueue } from '@app/shared/event-queue.port';
import type { DailyLog } from '@domain/log/daily-log';
import type { Todo } from '@domain/todo/todo';
import type { StoredEvent } from '@app/shared/event-types';
import { EntityIdMap } from '@app/shared/event-types';

interface EventRow {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  payload: string;
  timestamp: string;
  device_id: string;
  synced: number;
}

interface SnapshotTodoRow {
  notion_id: string;
  data: string;
  fetched_at: string;
}

interface SnapshotLogRow {
  date: string;
  data: string;
  fetched_at: string;
}

interface EntityIdMapRow {
  local_id: string;
  notion_id: string;
}

export class BunSqliteEventQueue implements IEventQueue {
  private readonly db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.db.exec('PRAGMA journal_mode=WAL');
    this.db.exec('PRAGMA synchronous=NORMAL');
  }

  migrate(): void {
    const migrationPath = join(import.meta.dir, 'migrations', '001_initial.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    this.db.exec(sql);
  }

  async append(event: StoredEvent): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO events (id, entity_type, entity_id, event_type, payload, timestamp, device_id, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      event.id,
      event.entity_type,
      event.entity_id,
      event.event_type,
      JSON.stringify(event.payload),
      event.timestamp,
      event.device_id,
      event.synced
    );
  }

  async pendingSync(): Promise<StoredEvent[]> {
    // Event ids are UUID v7 — lexicographic order equals creation order.
    // Sorting by id gives deterministic replay even for events created within
    // the same millisecond (where timestamp alone would be a tie).
    const stmt = this.db.prepare(
      `SELECT id, entity_type, entity_id, event_type, payload, timestamp, device_id, synced
       FROM events
       WHERE synced = 0
       ORDER BY id ASC`
    );
    const rows = stmt.all() as EventRow[];
    return rows.map(rowToStoredEvent);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    // SQLite placeholders must be inlined for dynamic IN clause
    const placeholders = ids.map(() => '?').join(', ');
    const stmt = this.db.prepare(
      `UPDATE events SET synced = 1 WHERE id IN (${placeholders})`
    );
    stmt.run(...ids);
  }

  async loadSnapshot(): Promise<{ todos: Todo[]; logs: DailyLog[] }> {
    const todoRows = this.db
      .prepare('SELECT notion_id, data, fetched_at FROM snapshot_todos')
      .all() as SnapshotTodoRow[];

    const logRows = this.db
      .prepare('SELECT date, data, fetched_at FROM snapshot_logs')
      .all() as SnapshotLogRow[];

    const todos = todoRows.map((row) => JSON.parse(row.data) as Todo);
    const logs = logRows.map((row) => JSON.parse(row.data) as DailyLog);

    return { todos, logs };
  }

  async saveSnapshot(todos: Todo[], logs: DailyLog[]): Promise<void> {
    const now = new Date().toISOString();

    const insertTodo = this.db.prepare(
      `INSERT INTO snapshot_todos (notion_id, data, fetched_at)
       VALUES (?, ?, ?)
       ON CONFLICT(notion_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`
    );
    const insertLog = this.db.prepare(
      `INSERT INTO snapshot_logs (date, data, fetched_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`
    );

    const saveTodosAndLogs = this.db.transaction(() => {
      for (const todo of todos) {
        if (!todo.id) throw new Error(`Snapshot received a todo with no id — invariant violation`);
        insertTodo.run(todo.id, JSON.stringify(todo), now);
      }
      for (const log of logs) {
        insertLog.run(log.date, JSON.stringify(log), now);
      }

      // Prune rows that no longer exist in Notion
      if (todos.length === 0) {
        this.db.exec('DELETE FROM snapshot_todos');
      } else {
        const placeholders = todos.map(() => '?').join(', ');
        this.db
          .prepare(`DELETE FROM snapshot_todos WHERE notion_id NOT IN (${placeholders})`)
          .run(...todos.map((t) => t.id));
      }

      if (logs.length === 0) {
        this.db.exec('DELETE FROM snapshot_logs');
      } else {
        const placeholders = logs.map(() => '?').join(', ');
        this.db
          .prepare(`DELETE FROM snapshot_logs WHERE date NOT IN (${placeholders})`)
          .run(...logs.map((l) => l.date));
      }
    });

    saveTodosAndLogs();
  }

  async upsertSnapshotLog(log: DailyLog): Promise<void> {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO snapshot_logs (date, data, fetched_at)
         VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`
      )
      .run(log.date, JSON.stringify(log), now);
  }

  async getEntityIdMap(): Promise<EntityIdMap> {
    const rows = this.db
      .prepare('SELECT local_id, notion_id FROM entity_id_map')
      .all() as EntityIdMapRow[];

    const map = new EntityIdMap();
    for (const row of rows) {
      map.set(row.local_id, row.notion_id);
    }
    return map;
  }

  async listCompletedTodayIds(sinceUtc: string): Promise<string[]> {
    // sinceUtc is start of local today in UTC (e.g. '2026-03-13T07:00:00.000Z' for UTC+7)
    // No upper bound needed — tasks cannot be marked done in the future
    const rows = this.db
      .prepare(
        `SELECT DISTINCT entity_id FROM events WHERE event_type = 'todo.completed' AND timestamp >= ?`
      )
      .all(sinceUtc) as { entity_id: string }[];
    return rows.map((r) => r.entity_id);
  }

  async getEventsForEntity(entityId: string): Promise<StoredEvent[]> {
    const rows = this.db
      .prepare(`SELECT id, entity_type, entity_id, event_type, payload, timestamp, device_id, synced FROM events WHERE entity_id = ? ORDER BY id ASC`)
      .all(entityId) as EventRow[];
    return rows.map(rowToStoredEvent);
  }

  /** Persists a local → Notion id mapping to the database. */
  async persistEntityIdMapping(localId: string, notionId: string): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO entity_id_map (local_id, notion_id)
         VALUES (?, ?)
         ON CONFLICT(local_id) DO UPDATE SET notion_id = excluded.notion_id`
      )
      .run(localId, notionId);
  }

  close(): void {
    this.db.close();
  }
}

function rowToStoredEvent(row: EventRow): StoredEvent {
  return {
    id: row.id,
    entity_type: row.entity_type as StoredEvent['entity_type'],
    entity_id: row.entity_id,
    event_type: row.event_type as StoredEvent['event_type'],
    payload: JSON.parse(row.payload) as StoredEvent['payload'],
    timestamp: row.timestamp,
    device_id: row.device_id,
    synced: row.synced as 0 | 1,
  };
}
