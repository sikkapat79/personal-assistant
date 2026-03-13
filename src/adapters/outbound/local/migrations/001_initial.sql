-- Write queue: local-first event log
CREATE TABLE IF NOT EXISTS events (
  id          TEXT NOT NULL PRIMARY KEY,
  entity_type TEXT NOT NULL,               -- 'todo' | 'daily_log'
  entity_id   TEXT NOT NULL,               -- local UUID or Notion page id / date string
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL,               -- JSON
  timestamp   TEXT NOT NULL,               -- ISO 8601 ms
  device_id   TEXT NOT NULL,
  synced      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_unsynced
  ON events (synced, timestamp ASC) WHERE synced = 0;

CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events (event_type, timestamp);

-- Notion snapshot cache: todos
CREATE TABLE IF NOT EXISTS snapshot_todos (
  notion_id   TEXT NOT NULL PRIMARY KEY,
  data        TEXT NOT NULL,               -- JSON of Todo
  fetched_at  TEXT NOT NULL
);

-- Notion snapshot cache: daily logs
CREATE TABLE IF NOT EXISTS snapshot_logs (
  date        TEXT NOT NULL PRIMARY KEY,   -- YYYY-MM-DD
  data        TEXT NOT NULL,               -- JSON of DailyLog
  fetched_at  TEXT NOT NULL
);

-- Local UUID → Notion page id
CREATE TABLE IF NOT EXISTS entity_id_map (
  local_id    TEXT NOT NULL PRIMARY KEY,
  notion_id   TEXT NOT NULL
);

-- Local-only session summary for cross-session context
CREATE TABLE IF NOT EXISTS session_summary (
  id         INTEGER PRIMARY KEY CHECK (id = 1),  -- single-row enforced
  summary    TEXT NOT NULL,
  updated_at TEXT NOT NULL  -- ISO 8601
);

-- Rolling message log for cross-session retention (last N messages kept)
CREATE TABLE IF NOT EXISTS session_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL     -- ISO 8601
);
