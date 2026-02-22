import type { DailyLog } from '../../domain/entities/daily-log';
import type { LogDate } from '../../domain/value-objects/log-date';

export interface ILogsRepository {
  findByDate(date: LogDate): Promise<DailyLog | null>;
  save(log: DailyLog): Promise<void>;
  findByDateRange(from: LogDate, to: LogDate): Promise<DailyLog[]>;
}
