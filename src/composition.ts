import type { ILogsRepository } from './application/ports/ILogsRepository';
import type { ITodosRepository } from './application/ports/ITodosRepository';
import { getNotionClient, loadNotionConfig } from './adapters/outbound/notion/client';
import { NotionLogsAdapter } from './adapters/outbound/notion/logs-adapter';
import { NotionTodosAdapter } from './adapters/outbound/notion/todos-adapter';
import { FilesystemContextAdapter } from './adapters/outbound/context/filesystem-context-adapter';
import { StubLLMAdapter } from './adapters/outbound/llm/stub-llm-adapter';
import { OpenAILLMAdapter } from './adapters/outbound/llm/openai-llm-adapter';
import { LogUseCase } from './application/use-cases/log-use-case';
import { TodosUseCase } from './application/use-cases/todos-use-case';
import { AgentUseCase } from './application/use-cases/agent-use-case';

export interface Composition {
  logs: ILogsRepository;
  todos: ITodosRepository;
  logUseCase: LogUseCase;
  todosUseCase: TodosUseCase;
  agentUseCase: AgentUseCase;
}

export function compose(): Composition {
  const config = loadNotionConfig();
  const client = getNotionClient(config.apiKey);
  // Map .env DB metadata (IDs + columns) → Logs & TODOs Notion adapters
  const logs = new NotionLogsAdapter(client, config.db.logs.databaseId, config.db.logs.columns);
  const todos = new NotionTodosAdapter(
    client,
    config.db.todos.databaseId,
    config.db.todos.columns,
    config.db.todos.doneKind
  );
  const logUseCase = new LogUseCase(logs);
  const todosUseCase = new TodosUseCase(todos);
  const context = new FilesystemContextAdapter();
  const apiKey = process.env.OPENAI_API_KEY;
  const llm =
    apiKey && apiKey.length > 0
      ? new OpenAILLMAdapter(apiKey, process.env.OPENAI_MODEL ?? undefined)
      : new StubLLMAdapter();
  const agentUseCase = new AgentUseCase(logs, todos, context, llm);
  return { logs, todos, logUseCase, todosUseCase, agentUseCase };
}
