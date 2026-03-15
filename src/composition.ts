import type { ILogsRepository } from './application/log/logs-repository.port';
import type { ITodosRepository } from './application/todo/todos-repository.port';
import type { IMetadataStore } from './application/shared/metadata-store.port';
import { getNotionClient, buildNotionConfigFromResolved } from './adapters/outbound/notion/client';
import { NotionLogsAdapter } from './adapters/outbound/notion/logs-adapter';
import { NotionTodosAdapter } from './adapters/outbound/notion/todos-adapter';
import { FileMetadataStore } from './adapters/outbound/file-metadata-store';
import { NotionMetadataStore } from './adapters/outbound/notion/notion-metadata-store';
import { FilesystemContextAdapter } from './adapters/outbound/context/filesystem-context-adapter';
import { StubLLMAdapter } from './adapters/outbound/llm/stub-llm-adapter';
import { OpenAILLMAdapter } from './adapters/outbound/llm/openai-llm-adapter';
import { LogUseCase } from './application/log/log-use-case';
import { TodosUseCase } from './application/todo/todos-use-case';
import { AgentUseCase } from './application/agent/agent-use-case';
import { getResolvedConfig } from './config/resolved';
import { ensureMetadataBootstrapped } from './config/metadata-bootstrap';
import { buildNotionConfigFromScope } from './config/notion-config-from-metadata';
import { getOrCreateMetadataDatabaseId } from './config/ensure-metadata-database';
import { SqliteSessionSummaryStore } from './adapters/outbound/local/sqlite-session-summary-store';
import { TursoEventQueue } from './adapters/outbound/turso/turso-event-queue';
import { createTursoDb } from './adapters/outbound/turso/client';
import type { TursoDb } from './adapters/outbound/turso/client';
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

  // Local-first layer: Turso (libSQL) event queue + in-memory projection
  const configDir = getConfigDir();
  const dbPath = join(configDir, 'turso.db');
  const tursoUrl = settings.TURSO_URL ?? '';
  const tursoToken = settings.TURSO_TOKEN ?? '';
  const db = createTursoDb({ tursoUrl, tursoToken, mode: 'embedded', localDbPath: dbPath });
  // TUI runs as the owner on a local device — isolated from web user_id space
  const eventQueue = new TursoEventQueue(db, '__tui__');
  await eventQueue.initialize();

  // Session store stays on a separate local SQLite file — session data is device-local only
  const sessionStore = new SqliteSessionSummaryStore(join(configDir, 'session.db'));

  const projection = new LocalProjection();
  const deviceId = getDeviceId();

  // Start the background sync engine
  const syncEngine = new SyncEngine(eventQueue, notionLogs, notionTodos);
  syncEngine.start();

  // Construct adapters before replaying events — handlers must be registered first
  const logs = new LocalLogsAdapter(eventQueue, projection, syncEngine, deviceId);
  const todos = new LocalTodosAdapter(eventQueue, projection, syncEngine, deviceId);

  // Seed the projection from the last known Notion snapshot.
  // Fetch both before touching the projection so there is no async gap
  // between loadFromSnapshot and applyAll (a gap would allow a concurrent
  // nudge → flush write to be cleared and permanently lost).
  const [cachedSnapshot, pendingEvents] = await Promise.all([
    eventQueue.loadSnapshot(),
    eventQueue.pendingSync(),
  ]);
  projection.loadFromSnapshot(cachedSnapshot);
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
  const agentUseCase = new AgentUseCase(logs, todos, context, llm, metadataStore, sessionStore);
  return { logs, todos, logUseCase, todosUseCase, agentUseCase, metadataStore };
}

/**
 * Build a Composition scoped to a specific web user.
 * Owner gets full Notion sync; family members get Turso-only (no Notion).
 * Called by the web server — migrations must already have run before this.
 */
export async function composeForUser(
  db: TursoDb,
  userId: string,
  isOwner: boolean,
): Promise<Composition> {
  const eventQueue = new TursoEventQueue(db, userId);
  const projection = new LocalProjection();
  const deviceId = getDeviceId();

  if (isOwner) {
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
    const syncEngine = new SyncEngine(eventQueue, notionLogs, notionTodos);
    const logs = new LocalLogsAdapter(eventQueue, projection, syncEngine, deviceId);
    const todos = new LocalTodosAdapter(eventQueue, projection, syncEngine, deviceId);
    const [cachedSnapshot, pendingEvents] = await Promise.all([
      eventQueue.loadSnapshot(),
      eventQueue.pendingSync(),
    ]);
    projection.loadFromSnapshot(cachedSnapshot);
    projection.applyAll(pendingEvents);
    hydrateFromNotion(eventQueue, projection, notionLogs, notionTodos).catch((err: unknown) => {
      console.error(
        '[composeForUser/owner] Notion hydration failed:',
        err instanceof Error ? err.message : String(err)
      );
    });
    const sessionStore = new SqliteSessionSummaryStore(join(getConfigDir(), 'session.db'));
    const context = new FilesystemContextAdapter();
    const apiKey = settings.OPENAI_API_KEY;
    const llm =
      apiKey && apiKey.length > 0
        ? new OpenAILLMAdapter(apiKey, settings.OPENAI_MODEL ?? undefined)
        : new StubLLMAdapter();
    const logUseCase = new LogUseCase(logs);
    const todosUseCase = new TodosUseCase(todos);
    const agentUseCase = new AgentUseCase(logs, todos, context, llm, metadataStore, sessionStore);
    // Start sync after all composition succeeds — prevents orphaned intervals if setup throws
    syncEngine.start();
    return { logs, todos, logUseCase, todosUseCase, agentUseCase, metadataStore };
  }

  // Family member: Turso-only, no Notion sync.
  // nudge() is a no-op so member events are stored locally but never pushed to Notion.
  const noopSync = {
    start: () => {},
    stop: () => {},
    nudge: () => {},
    flush: async () => {},
  } as unknown as SyncEngine;
  const logs = new LocalLogsAdapter(eventQueue, projection, noopSync, deviceId);
  const todos = new LocalTodosAdapter(eventQueue, projection, noopSync, deviceId);
  const [cachedSnapshot, pendingEvents] = await Promise.all([
    eventQueue.loadSnapshot(),
    eventQueue.pendingSync(),
  ]);
  projection.loadFromSnapshot(cachedSnapshot);
  projection.applyAll(pendingEvents);
  const metadataStore = new FileMetadataStore();
  const sessionStore = new SqliteSessionSummaryStore(join(getConfigDir(), 'session.db'));
  const context = new FilesystemContextAdapter();
  const logUseCase = new LogUseCase(logs);
  const todosUseCase = new TodosUseCase(todos);
  const agentUseCase = new AgentUseCase(
    logs,
    todos,
    context,
    new StubLLMAdapter(),
    metadataStore,
    sessionStore
  );
  return { logs, todos, logUseCase, todosUseCase, agentUseCase, metadataStore };
}
