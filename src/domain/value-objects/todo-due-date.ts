import { parseIsoDateOrDatetimeToYyyyMmDd } from './parse-iso-date';

/** Optional due date for a todo (YYYY-MM-DD). */
export type TodoDueDate = string | null;

export function createTodoDueDate(isoDate: string | null | undefined): TodoDueDate {
  if (isoDate == null || isoDate === '') return null;
  try {
    return parseIsoDateOrDatetimeToYyyyMmDd(isoDate);
  } catch (e) {
    throw new Error(`Invalid TodoDueDate: ${e instanceof Error ? e.message : String(e)}`);
  }
}
