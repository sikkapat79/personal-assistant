import type { DailyLog } from '@domain/log/daily-log';
import type { LogDate } from '@domain/log/log-date';

export interface ILogsRepository {
  findByDate(date: LogDate): Promise<DailyLog | null>;
  save(log: DailyLog): Promise<void>;
  findByDateRange(from: LogDate, to: LogDate): Promise<DailyLog[]>;
}
