import type { ChatMessage } from './llm-port';

export interface ISessionSummaryStore {
  /** Load the compressed snapshot of context older than the retained message window. */
  load(): string | null;
  /** Persist the compressed snapshot. */
  save(summary: string): void;
  /** Append a single message to the rolling message log. */
  saveMessage(role: 'user' | 'assistant', content: string): void;
  /** Return the most recent `limit` messages, oldest-first. */
  loadRecentMessages(limit: number): ChatMessage[];
  /** Delete messages beyond the most recent `limit` to keep the table bounded. */
  trimToLatest(limit: number): void;
}
