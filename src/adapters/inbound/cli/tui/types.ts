import type { ColumnMappingEntry } from '../../../../adapters/outbound/notion/client';

export type Page = 'main' | 'settings' | 'task-detail' | 'done-tasks';

export type ColumnSuggestionRow = ColumnMappingEntry & { suggested: string };
