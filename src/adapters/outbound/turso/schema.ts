import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: text('payload').notNull(),
    timestamp: text('timestamp').notNull(),
    deviceId: text('device_id').notNull(),
    synced: integer('synced').notNull().default(0),
  },
  (t) => [
    index('idx_events_unsynced').on(t.synced, t.timestamp),
    index('idx_events_type_timestamp').on(t.eventType, t.timestamp),
    index('idx_events_entity_id_id').on(t.entityId, t.id),
  ]
);

export const snapshotTodos = sqliteTable('snapshot_todos', {
  notionId: text('notion_id').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: text('fetched_at').notNull(),
});

export const snapshotLogs = sqliteTable('snapshot_logs', {
  date: text('date').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: text('fetched_at').notNull(),
});

export const entityIdMap = sqliteTable('entity_id_map', {
  localId: text('local_id').primaryKey(),
  notionId: text('notion_id').notNull(),
});
