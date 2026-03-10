import type { LogDate } from '@domain/log/log-date';
import type { LogContent } from '@domain/log/log-content';

/** Aggregate root: one log per date (identity = LogDate). */
export interface DailyLog {
  readonly date: LogDate;
  readonly content: LogContent;
  /** Set when loaded from persistence (Notion page id). */
  readonly id?: string;
}

export function createDailyLog(date: LogDate, content: LogContent, id?: string): DailyLog {
  return { date, content, id };
}

export function updateContent(log: DailyLog, content: LogContent): DailyLog {
  return { ...log, content };
}
