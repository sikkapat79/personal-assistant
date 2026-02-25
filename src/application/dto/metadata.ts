import type { LogsColumns, TodosColumns, TodosDoneKind } from '../../adapters/outbound/notion/client';

/** Scope for allowed Notion DBs and optional parent pages; used to build NotionConfig from metadata. */
export interface AllowedNotionScope {
  logsDatabaseId: string;
  todosDatabaseId: string;
  allowedPageParentIds?: string[];
  extraDatabaseIds?: string[];
  logsPurpose?: string;
  todosPurpose?: string;
  logsColumns?: LogsColumns;
  todosColumns?: TodosColumns;
  todosDoneKind?: TodosDoneKind;
}
