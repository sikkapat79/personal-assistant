import dayjs from 'dayjs';
import { parseStrictYyyyMmDd } from './parse-iso-date';

/** Immutable value object: date for a daily log (YYYY-MM-DD). */
export type LogDate = string;

export function createLogDate(isoDate: string): LogDate {
  try {
    return parseStrictYyyyMmDd(isoDate);
  } catch (e) {
    throw new Error(`Invalid LogDate: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function todayLogDate(): LogDate {
  return dayjs().format('YYYY-MM-DD');
}
