import type { ILogsRepository } from './application/ports/logs-repository';
import type { ITodosRepository } from './application/ports/todos-repository';
import type { IMetadataStore } from './application/ports/metadata-store';
import { getNotionClient, buildNotionConfigFromResolved } from './adapters/outbound/notion/client';
import { NotionLogsAdapter } from './adapters/outbound/notion/logs-adapter';
import { NotionTodosAdapter } from './adapters/outbound/notion/todos-adapter';
import { FileMetadataStore } from './adapters/outbound/file-metadata-store';
import { NotionMetadataStore } from './adapters/outbound/notion/notion-metadata-store';
import { FilesystemContextAdapter } from './adapters/outbound/context/filesystem-context-adapter';
import { StubLLMAdapter } from './adapters/outbound/llm/stub-llm-adapter';
import { OpenAILLMAdapter } from './adapters/outbound/llm/openai-llm-adapter';
import { LogUseCase } from './application/use-cases/log-use-case';
import { TodosUseCase } from './application/use-cases/todos-use-case';
import { AgentUseCase } from './application/use-cases/agent-use-case';
import { getResolvedConfig } from './config/resolved';
import { ensureMetadataBootstrapped } from './config/metadata-bootstrap';
import { buildNotionConfigFromScope } from './config/notion-config-from-metadata';
import { getOrCreateMetadataDatabaseId } from './config/ensure-metadata-database';
import { BunSqliteEventQueue } from './adapters/outbound/local/bun-sqlite-event-queue';
import { LocalProjection } from './adapters/outbound/local/local-projection';
import { LocalLogsAdapter } from './adapters/outbound/local/local-logs-adapter';
import { LocalTodosAdapter } from './adapters/outbound/local/local-todos-adapter';
import { SyncEngine } from './adapters/outbound/local/sync-engine';
import { hydrateFromNotion } from './adapters/outbound/local/hydration';
import { getDeviceId } from './adapters/outbound/local/device-id';
import { getConfigDir } from './config/config-dir';
import { join } from 'path';

export interface Composition {
  logs: ILogsRepository;
  todos: ITodosRepository;
  logUseCase: LogUseCase;
  todosUseCase: TodosUseCase;
  agentUseCase: AgentUseCase;
  metadataStore: IMetadataStore;
}

export async function compose(): Promise<Composition> {
  const { settings } = getResolvedConfig();
  const metadataDbId = await getOrCreateMetadataDatabaseId(settings);
  const metadataStore: IMetadataStore =
    metadataDbId && settings.NOTION_API_KEY
      ? new NotionMetadataStore(getNotionClient(settings.NOTION_API_KEY), metadataDbId)
      : new FileMetadataStore();

  await ensureMetadataBootstrapped(metadataStore, settings);

  const scope = metadataStore.getAllowedNotionScope();
  const config =
    scope?.logsColumns && scope?.todosColumns && scope?.todosDoneKind && settings.NOTION_API_KEY
      ? buildNotionConfigFromScope(scope, settings.NOTION_API_KEY)
      : buildNotionConfigFromResolved(settings);

  const client = getNotionClient(config.apiKey);
  const notionLogs = new NotionLogsAdapter(client, config.db.logs.databaseId, config.db.logs.columns);
  const notionTodos = new NotionTodosAdapter(
    client,
    config.db.todos.databaseId,
    config.db.todos.columns,
    config.db.todos.doneKind
  );

  // Local-first layer: SQLite event queue + projection
  const dbPath = join(getConfigDir(), 'pax.db');
  const eventQueue = new BunSqliteEventQueue(dbPath);
  eventQueue.migrate();

  const projection = new LocalProjection();
  const deviceId = getDeviceId();

  // Start the background sync engine
  const syncEngine = new SyncEngine(eventQueue, notionLogs, notionTodos);
  syncEngine.start();

  // Construct adapters before replaying events — handlers must be registered first
  const logs = new LocalLogsAdapter(eventQueue, projection, syncEngine, deviceId);
  const todos = new LocalTodosAdapter(eventQueue, projection, syncEngine, deviceId);

  // Seed the projection from the last known Notion snapshot
  const cachedSnapshot = eventQueue.loadSnapshot();
  projection.loadFromSnapshot(cachedSnapshot);

  // Apply any locally-queued writes on top of the cached snapshot
  const pendingEvents = eventQueue.pendingSync();
  projection.applyAll(pendingEvents);

  // Re-hydrate from Notion in the background — does not block app startup
  hydrateFromNotion(eventQueue, projection, notionLogs, notionTodos).catch((err: unknown) => {
    console.error('[compose] Background Notion hydration failed:', err instanceof Error ? err.message : String(err));
  });

  const logUseCase = new LogUseCase(logs);
  const todosUseCase = new TodosUseCase(todos);
  const context = new FilesystemContextAdapter();
  const apiKey = settings.OPENAI_API_KEY;
  const llm =
    apiKey && apiKey.length > 0
      ? new OpenAILLMAdapter(apiKey, settings.OPENAI_MODEL ?? undefined)
      : new StubLLMAdapter();
  const agentUseCase = new AgentUseCase(logs, todos, context, llm, metadataStore);
  return { logs, todos, logUseCase, todosUseCase, agentUseCase, metadataStore };
}
