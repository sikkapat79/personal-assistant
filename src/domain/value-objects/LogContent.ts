/** Immutable value object: log entry content. All fields optional except title for backward compatibility. */
export interface LogContent {
  readonly title: string;
  /** Legacy / combined notes; can map to one of the text fields. */
  readonly notes?: string;
  readonly score?: number;
  readonly mood?: number;
  readonly energy?: number;
  readonly deepWorkHours?: number;
  readonly workout?: boolean;
  readonly diet?: boolean;
  readonly readingMins?: number;
  readonly wentWell?: string;
  readonly improve?: string;
  readonly gratitude?: string;
  readonly tomorrow?: string;
}

export function createLogContent(
  title: string,
  notes = '',
  extra?: Partial<Omit<LogContent, 'title' | 'notes'>>
): LogContent {
  return {
    title: title.trim(),
    notes: notes.trim() || undefined,
    ...extra,
  };
}
