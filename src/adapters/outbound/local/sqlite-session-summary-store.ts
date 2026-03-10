import { Database } from 'bun:sqlite';
import type { ISessionSummaryStore } from '../../../application/ports/session-summary-store';
import type { ChatMessage } from '../../../application/ports/llm-port';

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
    this.db = new Database(dbPath);
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
}
