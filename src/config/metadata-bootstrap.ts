import type { LogsColumns, TodosColumns, TodosDoneKind } from '../adapters/outbound/notion/client';
import { buildNotionScopeFromSettings } from '../adapters/outbound/notion/client';
import { getColumnPurpose } from '../adapters/outbound/notion/notion-schema';
import type { NotionSettingsShape } from '../adapters/outbound/notion/client';
import type { IMetadataStore } from '../application/ports/metadata-store';
import type { AllowedNotionScope } from '../application/dto/metadata';
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
 * Sync metadata store from resolved settings on every load.
 * When required settings (NOTION_LOGS_DATABASE_ID, NOTION_TODOS_DATABASE_ID) are present,
 * writes scope and cached schemas from current settings so that any change in settings
 * (e.g. NOTION_PAGES_PARENT_ID, column mapping) is applied when the user re-visits.
 * Does nothing if required settings are missing.
 */
export async function ensureMetadataBootstrapped(
  store: IMetadataStore,
  settings: NotionSettingsShape
): Promise<void> {
  const built = buildNotionScopeFromSettings(settings);
  if (!built) return;

  const allowedPageParentIds =
    settings.NOTION_PAGES_PARENT_ID?.trim() ?
      [settings.NOTION_PAGES_PARENT_ID.trim()] :
      undefined;

  const newScope: AllowedNotionScope = {
    logsDatabaseId: built.logsDatabaseId,
    todosDatabaseId: built.todosDatabaseId,
    allowedPageParentIds,
    logsPurpose: 'Daily journal',
    todosPurpose: 'Tasks',
    logsColumns: built.logsColumns,
    todosColumns: built.todosColumns,
    todosDoneKind: built.doneKind,
  };
  await store.setAllowedNotionScope(newScope);

  const logsSchema = schemaFromLogsColumns(built.logsDatabaseId, built.logsColumns);
  const todosSchema = schemaFromTodosColumns(built.todosDatabaseId, built.todosColumns, built.doneKind);
  await store.setCachedSchema(built.logsDatabaseId, logsSchema);
  await store.setCachedSchema(built.todosDatabaseId, todosSchema);
}
