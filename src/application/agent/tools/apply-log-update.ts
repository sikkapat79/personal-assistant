import { LogUseCase } from '@app/log/log-use-case';
import { parseSingleFieldValue } from '../parse-single-field-value';
import type { ToolDeps } from '../tool-deps';

export async function handleApplyLogUpdate(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const logUseCase = new LogUseCase(deps.logs);
  const date = String(args.date ?? '');
  const mode = String(args.mode ?? '');
  const existing = await deps.logs.findByDate(date);

  if (mode === 'create') {
    if (existing) {
      return 'Error: Log already exists for this date. Use single_field or summarize instead.';
    }
    const sleepNotes =
      args.sleep_notes !== undefined && String(args.sleep_notes).trim() !== ''
        ? String(args.sleep_notes).trim()
        : args.notes !== undefined && String(args.notes).trim() !== ''
          ? String(args.notes).trim()
          : undefined;
    const mood = typeof args.mood === 'number' && Number.isFinite(args.mood) ? args.mood : undefined;
    const energy = typeof args.energy === 'number' && Number.isFinite(args.energy) ? args.energy : undefined;
    if (!sleepNotes || mood === undefined || energy === undefined) {
      const missing: string[] = [];
      if (!sleepNotes) missing.push('sleeping record (sleep_notes or notes)');
      if (mood === undefined) missing.push('mood');
      if (energy === undefined) missing.push('energy budget');
      return `Error: Create requires ${missing.join(', ')}.`;
    }
    const sleepMins = typeof args.sleep_mins === 'number' && Number.isFinite(args.sleep_mins) ? Math.round(args.sleep_mins) : undefined;
    const title = args.title !== undefined && String(args.title).trim() !== '' ? String(args.title).trim() : undefined;
    const result = await logUseCase.upsert({ date, title, sleepNotes, sleepMins, mood, energy });
    return result.created
      ? `Created log for ${date}${title ? `: "${title}"` : ''} with sleep, mood, energy.`
      : `Updated log for ${date}.`;
  }

  if (mode === 'single_field') {
    if (!existing) {
      return 'Error: No log for this date. Create it first (sleep, mood, energy) using mode create.';
    }
    const field = String(args.field ?? '').trim();
    const rawValue = args.value;
    if (!field) return 'Error: single_field requires field and value.';
    const parsed = parseSingleFieldValue(field, rawValue);
    if (parsed === undefined) {
      return `Error: Unknown or unsupported field "${field}" or invalid value.`;
    }
    await logUseCase.upsert({ date, ...parsed });
    return `Updated ${field} for ${date}.`;
  }

  if (mode === 'summarize') {
    if (!existing) {
      return 'Error: No log for this date. Create it first (sleep, mood, energy) using mode create.';
    }
    const score = typeof args.score === 'number' && Number.isFinite(args.score) ? args.score : undefined;
    const title = args.title !== undefined && String(args.title).trim() !== '' ? String(args.title).trim() : undefined;
    const wentWell = args.went_well !== undefined && args.went_well !== '' ? String(args.went_well) : undefined;
    const improve = args.improve !== undefined && args.improve !== '' ? String(args.improve) : undefined;
    const gratitude = args.gratitude !== undefined && args.gratitude !== '' ? String(args.gratitude) : undefined;
    const tomorrow = args.tomorrow !== undefined && args.tomorrow !== '' ? String(args.tomorrow) : undefined;
    const energy = typeof args.energy === 'number' && Number.isFinite(args.energy) ? args.energy : undefined;
    if (score === undefined || !title || !wentWell || !improve || !gratitude || !tomorrow || energy === undefined) {
      const missing: string[] = [];
      if (score === undefined) missing.push('score');
      if (!title) missing.push('title');
      if (!wentWell) missing.push('went_well');
      if (!improve) missing.push('improve');
      if (!gratitude) missing.push('gratitude');
      if (!tomorrow) missing.push('tomorrow');
      if (energy === undefined) missing.push('energy');
      return `Error: Summarize requires all of: ${missing.join(', ')}.`;
    }
    const notes = args.notes !== undefined && String(args.notes).trim() !== '' ? String(args.notes).trim() : undefined;
    await logUseCase.upsert({ date, score, title, wentWell, improve, gratitude, tomorrow, energy, notes });
    return `Summarized log for ${date}: "${title}".`;
  }

  return `Error: Unknown mode "${mode}". Use create, single_field, or summarize.`;
}
