import type { ILogsRepository } from '../../../application/ports/logs-repository';
import type { DailyLog } from '../../../domain/entities/daily-log';
import type { LogDate } from '../../../domain/value-objects/log-date';
import mockDataJson from '../../../../fixtures/mock-data.json';

/**
 * Mock Logs Adapter - Returns sanitized data from fixtures
 * Use this for visual testing without external API calls
 */
export class MockLogsAdapter implements ILogsRepository {
  private mockData = mockDataJson;

  async findByDate(date: LogDate): Promise<DailyLog | null> {
    return this.mockData.log as DailyLog | null;
  }

  async findByDateRange(start: LogDate, end: LogDate): Promise<DailyLog[]> {
    return this.mockData.log ? [this.mockData.log as DailyLog] : [];
  }

  async save(log: DailyLog): Promise<void> {
    console.log('[MockLogsAdapter] save called (no-op):', log.date);
  }
}
