/** Immutable value object: date for a daily log (YYYY-MM-DD). */
export type LogDate = string;

export function createLogDate(isoDate: string): LogDate {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid LogDate: ${isoDate}`);
  return isoDate.slice(0, 10);
}

export function todayLogDate(): LogDate {
  return new Date().toISOString().slice(0, 10);
}
