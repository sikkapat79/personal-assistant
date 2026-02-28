import type { ILogsRepository } from './application/ports/logs-repository';
import type { ITodosRepository } from './application/ports/todos-repository';
import type { IMetadataStore } from './application/ports/metadata-store';
import { MockLogsAdapter } from './adapters/outbound/mock/mock-logs-adapter';
import { MockTodosAdapter } from './adapters/outbound/mock/mock-todos-adapter';
import { InMemoryMetadataStore } from './adapters/outbound/mock/in-memory-metadata-store';
import { FilesystemContextAdapter } from './adapters/outbound/context/filesystem-context-adapter';
import { StubLLMAdapter } from './adapters/outbound/llm/stub-llm-adapter';
import { LogUseCase } from './application/use-cases/log-use-case';
import { TodosUseCase } from './application/use-cases/todos-use-case';
import { AgentUseCase } from './application/use-cases/agent-use-case';

export interface Composition {
  logs: ILogsRepository;
  todos: ITodosRepository;
  logUseCase: LogUseCase;
  todosUseCase: TodosUseCase;
  agentUseCase: AgentUseCase;
  metadataStore: IMetadataStore;
}

/**
 * Mock composition - uses sanitized fixture data instead of Notion API
 * Use this for visual testing without external dependencies
 */
export async function composeMock(): Promise<Composition> {
  const logs = new MockLogsAdapter();
  const todos = new MockTodosAdapter();
  const logUseCase = new LogUseCase(logs);
  const todosUseCase = new TodosUseCase(todos);
  const context = new FilesystemContextAdapter();
  const llm = new StubLLMAdapter();
  const metadataStore = new InMemoryMetadataStore();
  const agentUseCase = new AgentUseCase(logs, todos, context, llm, metadataStore);

  return { logs, todos, logUseCase, todosUseCase, agentUseCase, metadataStore };
}
