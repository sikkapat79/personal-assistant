import type { LogsColumns, TodosColumns, TodosDoneKind } from '../adapters/outbound/notion/client';
import { buildNotionScopeFromSettings } from '../adapters/outbound/notion/client';
import { getColumnPurpose } from '../adapters/outbound/notion/notion-schema';
import type { NotionSettingsShape } from '../adapters/outbound/notion/client';
import type { DatabaseSchema } from '../domain/metadata';

const LOGS_NOTION_TYPES: Record<keyof LogsColumns, string> = {
  title: 'title',
  date: 'date',
  score: 'number',
  mood: 'number',
  energy: 'number',
  deepWorkHours: 'number',
  workout: 'checkbox',
  diet: 'checkbox',
  readingMins: 'number',
  wentWell: 'rich_text',
  improve: 'rich_text',
  gratitude: 'rich_text',
  tomorrow: 'rich_text',
};

const TODOS_NOTION_TYPES: Record<keyof TodosColumns, string> = {
  title: 'title',
  category: 'select',
  dueDate: 'date',
  notes: 'rich_text',
  priority: 'select',
  done: 'checkbox',
};

function schemaFromLogsColumns(databaseId: string, columns: LogsColumns): DatabaseSchema {
  const properties = (Object.entries(columns) as [keyof LogsColumns, string][]).map(
    ([key, name]) => ({
      name,
      notionType: LOGS_NOTION_TYPES[key],
      purpose: getColumnPurpose('logs', key) || undefined,
    })
  );
  return { databaseId, properties };
}

function schemaFromTodosColumns(
  databaseId: string,
  columns: TodosColumns,
  doneKind: TodosDoneKind
): DatabaseSchema {
  const properties = (Object.entries(columns) as [keyof TodosColumns, string][]).map(
    ([key, name]) => ({
      name,
      notionType: key === 'done' && doneKind.type === 'status' ? 'status' : TODOS_NOTION_TYPES[key],
      purpose: getColumnPurpose('todos', key) || undefined,
    })
  );
  return { databaseId, properties };
}

/**
 * Schema knowledge-base from settings only: parent page (NOTION_PAGES_PARENT_ID) and column mapping.
 * No metadata.json; build scope and schema from resolved settings on each load.
 */

/** Build compact "Databases and properties" summary for the system prompt from settings. */
export function buildSchemaSummaryFromSettings(settings: NotionSettingsShape): string | null {
  const built = buildNotionScopeFromSettings(settings);
  if (!built) return null;
  const parts: string[] = [];
  parts.push(`Daily journal: ${Object.values(built.logsColumns).join(', ')}`);
  parts.push(`Tasks: ${Object.values(built.todosColumns).join(', ')}`);
  return parts.join('; ');
}

/** Return cached schema for a database from settings (logs or todos DB by ID). */
export function getSchemaForDatabaseFromSettings(
  settings: NotionSettingsShape,
  databaseId: string
): DatabaseSchema | null {
  const built = buildNotionScopeFromSettings(settings);
  if (!built) return null;
  if (databaseId === built.logsDatabaseId) {
    return schemaFromLogsColumns(built.logsDatabaseId, built.logsColumns);
  }
  if (databaseId === built.todosDatabaseId) {
    return schemaFromTodosColumns(built.todosDatabaseId, built.todosColumns, built.doneKind);
  }
  return null;
}
