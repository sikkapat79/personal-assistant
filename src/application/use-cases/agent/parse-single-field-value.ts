import type { LogInputDto } from '../../dto/log-dto';

/** Map single_field (field name + value) to one key of LogInputDto for merge. */
export function parseSingleFieldValue(
  field: string,
  rawValue: unknown
): Partial<Omit<LogInputDto, 'date'>> | undefined {
  const v = rawValue;
  const str = typeof v === 'string' ? v.trim().toLowerCase() : '';
  const num = typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  const bool =
    v === true || v === false ? v : str === 'true' ? true : str === 'false' ? false : undefined;
  switch (field) {
    case 'workout':
      return bool !== undefined ? { workout: bool } : undefined;
    case 'diet':
      return bool !== undefined ? { diet: bool } : undefined;
    case 'mood':
      return !Number.isNaN(num) && num >= 1 && num <= 5 ? { mood: num } : undefined;
    case 'energy':
      return !Number.isNaN(num) && num >= 1 && num <= 100 ? { energy: Math.round(num) } : undefined;
    case 'score':
      return !Number.isNaN(num) && num >= 1 && num <= 10 ? { score: Math.round(num) } : undefined;
    case 'deep_work_hours':
      return !Number.isNaN(num) && num >= 0 ? { deepWorkHours: num } : undefined;
    case 'reading_mins':
      return !Number.isNaN(num) && num >= 0 ? { readingMins: Math.round(num) } : undefined;
    case 'title':
      return typeof v === 'string' && v.trim() !== '' ? { title: v.trim() } : undefined;
    case 'notes':
      return v !== undefined && v !== null ? { notes: String(v).trim() || undefined } : undefined;
    case 'sleep_notes':
      return typeof v === 'string' && v.trim() !== '' ? { sleepNotes: v.trim() } : undefined;
    case 'sleep_mins':
      return !Number.isNaN(num) && num >= 0 ? { sleepMins: Math.round(num) } : undefined;
    default:
      return undefined;
  }
}
