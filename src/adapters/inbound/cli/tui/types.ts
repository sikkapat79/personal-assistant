import type { ColumnMappingEntry } from '../../../../adapters/outbound/notion/client';

export type Page = 'main' | 'settings' | 'task-detail';

export type ColumnSuggestionRow = ColumnMappingEntry & { suggested: string };
