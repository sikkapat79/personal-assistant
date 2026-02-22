import type { LogDate } from '../value-objects/log-date';
import type { LogContent } from '../value-objects/log-content';

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
