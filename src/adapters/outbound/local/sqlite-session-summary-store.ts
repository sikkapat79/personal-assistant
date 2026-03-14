import { Database } from 'bun:sqlite';
import type { ISessionSummaryStore } from '@app/agent/session-summary-store.port';
import type { ChatMessage } from '@app/agent/chat-message';

interface MessageRow {
  role: string;
  content: string;
}

function isValidRole(role: string): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant';
}

export class SqliteSessionSummaryStore implements ISessionSummaryStore {
  private readonly db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_summary (
        id         INTEGER PRIMARY KEY CHECK (id = 1),
        summary    TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  load(): string | null {
    const row = this.db
      .prepare('SELECT summary FROM session_summary WHERE id = 1')
      .get() as { summary: string } | null;
    return row?.summary ?? null;
  }

  save(summary: string): void {
    this.db
      .prepare(
        `INSERT INTO session_summary (id, summary, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at`
      )
      .run(summary, new Date().toISOString());
  }

  saveMessage(role: 'user' | 'assistant', content: string): void {
    this.db
      .prepare('INSERT INTO session_messages (role, content, created_at) VALUES (?, ?, ?)')
      .run(role, content, new Date().toISOString());
  }

  loadRecentMessages(limit: number): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT role, content FROM session_messages
         ORDER BY id DESC LIMIT ?`
      )
      .all(limit) as MessageRow[];
    // Rows are newest-first from DESC; reverse to get oldest-first for LLM context
    return rows.reverse().flatMap((r) => (isValidRole(r.role) ? [{ role: r.role, content: r.content }] : []));
  }

  trimToLatest(limit: number): void {
    this.db
      .prepare(
        `DELETE FROM session_messages
         WHERE id NOT IN (SELECT id FROM session_messages ORDER BY id DESC LIMIT ?)`
      )
      .run(limit);
  }

  clearSession(): void {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM session_messages').run();
      this.db.prepare('DELETE FROM session_summary').run();
    })();
  }
}
