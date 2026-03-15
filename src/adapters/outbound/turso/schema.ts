import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';

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
    index('idx_events_user_id').on(t.userId),
  ]
);

export const snapshotTodos = sqliteTable(
  'snapshot_todos',
  {
    userId: text('user_id').notNull(),
    notionId: text('notion_id').notNull(),
    data: text('data').notNull(),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.notionId] })]
);

export const snapshotLogs = sqliteTable(
  'snapshot_logs',
  {
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    data: text('data').notNull(),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })]
);

export const entityIdMap = sqliteTable(
  'entity_id_map',
  {
    userId: text('user_id').notNull(),
    localId: text('local_id').notNull(),
    notionId: text('notion_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.localId] })]
);

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
