import type { DailyLog } from '../../domain/entities/DailyLog';
import type { LogDate } from '../../domain/value-objects/LogDate';

export interface ILogsRepository {
  findByDate(date: LogDate): Promise<DailyLog | null>;
  save(log: DailyLog): Promise<void>;
  findByDateRange(from: LogDate, to: LogDate): Promise<DailyLog[]>;
}
