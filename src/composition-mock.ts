import type { Composition } from './composition';
import { MockLogsAdapter } from './adapters/outbound/mock/mock-logs-adapter';
import { MockTodosAdapter } from './adapters/outbound/mock/mock-todos-adapter';
import { InMemoryMetadataStore } from './adapters/outbound/mock/in-memory-metadata-store';
import { FilesystemContextAdapter } from './adapters/outbound/context/filesystem-context-adapter';
import { StubLLMAdapter } from './adapters/outbound/llm/stub-llm-adapter';
import { LogUseCase } from './application/log/log-use-case';
import { TodosUseCase } from './application/todo/todos-use-case';
import { AgentUseCase } from './application/agent/agent-use-case';
import type { ISessionSummaryStore } from './application/agent/session-summary-store.port';

/** No-op session store for mock/test environments (no SQLite). */
const noopSessionStore: ISessionSummaryStore = {
  load: () => null,
  save: () => {},
  saveMessage: () => {},
  loadRecentMessages: () => [],
  trimToLatest: () => {},
};

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
  const agentUseCase = new AgentUseCase(logs, todos, context, llm, metadataStore, noopSessionStore);

  return { logs, todos, logUseCase, todosUseCase, agentUseCase, metadataStore };
}
