/** Optional due date for a todo (YYYY-MM-DD). */
export type TodoDueDate = string | null;

export function createTodoDueDate(isoDate: string | null | undefined): TodoDueDate {
  if (isoDate == null || isoDate === '') return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid TodoDueDate: ${isoDate}`);
  return isoDate.slice(0, 10);
}
