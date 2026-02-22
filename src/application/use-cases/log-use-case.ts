import type { ILogsRepository } from '../ports/logs-repository';
import type { LogContent } from '../../domain/value-objects/log-content';
import { createLogDate } from '../../domain/value-objects/log-date';
import { createLogContent } from '../../domain/value-objects/log-content';
import { createDailyLog, updateContent } from '../../domain/entities/daily-log';
import type { LogInputDto, LogResultDto } from '../dto/log-dto';

function mergeLogContent(existing: LogContent | undefined, input: LogInputDto): LogContent {
  const title = input.title ?? existing?.title ?? 'Untitled';
  const notes = input.notes ?? existing?.notes ?? '';
  const optional = <K extends keyof Omit<LogContent, 'title' | 'notes'>>(key: K) =>
    input[key] !== undefined ? input[key] : existing?.[key];
  return createLogContent(title, notes, {
    score: optional('score'),
    mood: optional('mood'),
    energy: optional('energy'),
    deepWorkHours: optional('deepWorkHours'),
    workout: optional('workout'),
    diet: optional('diet'),
    readingMins: optional('readingMins'),
    wentWell: optional('wentWell'),
    improve: optional('improve'),
    gratitude: optional('gratitude'),
    tomorrow: optional('tomorrow'),
  });
}

export class LogUseCase {
  constructor(private readonly logs: ILogsRepository) {}

  async upsert(input: LogInputDto): Promise<LogResultDto> {
    const date = createLogDate(input.date);
    const existing = await this.logs.findByDate(date);
    if (!existing) {
      const hasNotes = input.notes !== undefined && String(input.notes).trim().length > 0;
      const hasMood = input.mood !== undefined && Number.isFinite(input.mood);
      const hasEnergy = input.energy !== undefined && Number.isFinite(input.energy);
      if (!hasNotes || !hasMood || !hasEnergy) {
        const missing: string[] = [];
        if (!hasNotes) missing.push('sleeping record (notes)');
        if (!hasMood) missing.push('mood');
        if (!hasEnergy) missing.push('energy budget');
        throw new Error(`New log must include at least: ${missing.join(', ')}. Create first with sleep, mood, and energy.`);
      }
    }
    const content = mergeLogContent(existing?.content, input);
    const log = existing
      ? updateContent(existing, content)
      : createDailyLog(date, content);
    await this.logs.save(log);
    return { created: !existing, date };
  }
}
