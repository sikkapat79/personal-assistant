import { LogUseCase } from '@app/log/log-use-case';
import type { ToolDeps } from '../tool-deps';

export async function handleUpsertLog(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const logUseCase = new LogUseCase(deps.logs);
  const date = String(args.date ?? '');
  const title = args.title !== undefined && args.title !== '' ? String(args.title) : undefined;
  const notes = args.notes !== undefined && args.notes !== '' ? String(args.notes) : undefined;
  const score = typeof args.score === 'number' && Number.isFinite(args.score) ? args.score : undefined;
  const mood = typeof args.mood === 'number' && Number.isFinite(args.mood) ? args.mood : undefined;
  const energy = typeof args.energy === 'number' && Number.isFinite(args.energy) ? args.energy : undefined;
  const deepWorkHours =
    typeof args.deep_work_hours === 'number' && Number.isFinite(args.deep_work_hours)
      ? args.deep_work_hours
      : undefined;
  const workout = typeof args.workout === 'boolean' ? args.workout : undefined;
  const diet = typeof args.diet === 'boolean' ? args.diet : undefined;
  const readingMins =
    typeof args.reading_mins === 'number' && Number.isFinite(args.reading_mins) ? args.reading_mins : undefined;
  const wentWell = args.went_well !== undefined && args.went_well !== '' ? String(args.went_well) : undefined;
  const improve = args.improve !== undefined && args.improve !== '' ? String(args.improve) : undefined;
  const gratitude = args.gratitude !== undefined && args.gratitude !== '' ? String(args.gratitude) : undefined;
  const tomorrow = args.tomorrow !== undefined && args.tomorrow !== '' ? String(args.tomorrow) : undefined;
  const result = await logUseCase.upsert({
    date, title, notes, score, mood, energy, deepWorkHours, workout, diet,
    readingMins, wentWell, improve, gratitude, tomorrow,
  });
  return result.created
    ? `Created a new log for ${date}${title ? `: "${title}"` : ''}.`
    : `Updated the log for ${date}${title ? `: "${title}"` : ''}.`;
}
