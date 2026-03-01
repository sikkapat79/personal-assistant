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
