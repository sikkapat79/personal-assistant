import type { ILogsRepository } from '@app/log/logs-repository.port';
import type { ITodosRepository } from '@app/todo/todos-repository.port';
import type { IMetadataStore } from '@app/shared/metadata-store.port';

export interface ToolDeps {
  logs: ILogsRepository;
  todos: ITodosRepository;
  metadataStore: IMetadataStore;
}
