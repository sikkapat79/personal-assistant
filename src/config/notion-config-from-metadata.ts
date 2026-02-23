import type { NotionConfig, NotionDbMetadata } from '../adapters/outbound/notion/client';
import type { AllowedNotionScope } from '../application/dto/metadata';

/**
 * Build NotionConfig from metadata scope and API key.
 * Use when metadata store has been bootstrapped and scope contains column mapping.
 */
export function buildNotionConfigFromScope(
  scope: AllowedNotionScope,
  apiKey: string
): NotionConfig {
  if (!scope.logsColumns || !scope.todosColumns || !scope.todosDoneKind) {
    throw new Error('Scope missing logsColumns, todosColumns, or todosDoneKind');
  }
  if (!apiKey) throw new Error('Missing NOTION_API_KEY');
  const db: NotionDbMetadata = {
    logs: {
      databaseId: scope.logsDatabaseId,
      columns: scope.logsColumns,
    },
    todos: {
      databaseId: scope.todosDatabaseId,
      columns: scope.todosColumns,
      doneKind: scope.todosDoneKind,
    },
  };
  return {
    apiKey,
    logsDatabaseId: scope.logsDatabaseId,
    todosDatabaseId: scope.todosDatabaseId,
    db,
  };
}
