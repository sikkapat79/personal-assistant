import type { ILogsRepository } from '@app/log/logs-repository.port';
import type { LogContent } from '@domain/log/log-content';
import { createLogDate } from '@domain/log/log-date';
import { createLogContent } from '@domain/log/log-content';
import { createDailyLog, updateContent } from '@domain/log/daily-log';
import type { LogInputDto, LogResultDto } from '@app/log/log-dto';

function mergeLogContent(existing: LogContent | undefined, input: LogInputDto): LogContent {
  const title = input.title ?? existing?.title ?? 'Untitled';
  const notes = input.notes ?? existing?.notes ?? '';
  const optional = <K extends keyof Omit<LogContent, 'title' | 'notes' | 'sleepNotes' | 'sleepMins'>>(key: K) =>
    input[key] !== undefined ? input[key] : existing?.[key];
  // sleepNotes: prefer input, then existing sleepNotes, then fall back to existing legacy notes for backward compat
  const sleepNotes = input.sleepNotes ?? existing?.sleepNotes ?? existing?.notes;
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
    sleepNotes,
    sleepMins: input.sleepMins !== undefined ? input.sleepMins : existing?.sleepMins,
  });
}

export class LogUseCase {
  constructor(private readonly logs: ILogsRepository) {}

  async upsert(input: LogInputDto): Promise<LogResultDto> {
    const date = createLogDate(input.date);
    const existing = await this.logs.findByDate(date);
    if (!existing) {
      const hasSleep =
        (input.sleepNotes !== undefined && String(input.sleepNotes).trim().length > 0) ||
        (input.notes !== undefined && String(input.notes).trim().length > 0);
      const hasMood = input.mood !== undefined && Number.isFinite(input.mood);
      const hasEnergy = input.energy !== undefined && Number.isFinite(input.energy);
      if (!hasSleep || !hasMood || !hasEnergy) {
        const missing: string[] = [];
        if (!hasSleep) missing.push('sleeping record (sleepNotes or notes)');
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
