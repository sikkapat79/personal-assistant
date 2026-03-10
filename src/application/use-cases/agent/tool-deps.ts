import type { ILogsRepository } from '../../ports/logs-repository';
import type { ITodosRepository } from '../../ports/todos-repository';
import type { IMetadataStore } from '../../ports/metadata-store';

export interface ToolDeps {
  logs: ILogsRepository;
  todos: ITodosRepository;
  metadataStore: IMetadataStore;
}
