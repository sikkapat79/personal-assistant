import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ─── App tables ──────────────────────────────────────────────────────────────

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
    userId: text('user_id'),
  },
  (t) => [
    index('idx_events_unsynced').on(t.synced, t.id),
    index('idx_events_type_timestamp').on(t.eventType, t.timestamp),
    index('idx_events_entity_id_id').on(t.entityId, t.id),
  ]
);

export const snapshotTodos = sqliteTable('snapshot_todos', {
  notionId: text('notion_id').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: text('fetched_at').notNull(),
  userId: text('user_id'),
});

export const snapshotLogs = sqliteTable('snapshot_logs', {
  date: text('date').primaryKey(),
  data: text('data').notNull(),
  fetchedAt: text('fetched_at').notNull(),
  userId: text('user_id'),
});

export const entityIdMap = sqliteTable('entity_id_map', {
  localId: text('local_id').primaryKey(),
  notionId: text('notion_id').notNull(),
  userId: text('user_id'),
});

export const invites = sqliteTable('invites', {
  email: text('email').primaryKey(),
  invitedBy: text('invited_by').notNull(),
  invitedAt: text('invited_at').notNull(),
});

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
