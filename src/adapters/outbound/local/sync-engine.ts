import type { IEventQueue } from '../../../application/ports/event-queue';
import type { StoredEvent, TodoCreatedPayload, DailyLogUpsertedPayload } from '../../../application/ports/event-types';
import { EntityType, EventType } from '../../../application/ports/event-types';
import type { NotionLogsAdapter } from '../notion/logs-adapter';
import type { NotionTodosAdapter } from '../notion/todos-adapter';
import { createTodo } from '../../../domain/entities/todo';
import { createLogContent } from '../../../domain/value-objects/log-content';
import { createDailyLog } from '../../../domain/entities/daily-log';

const SYNC_INTERVAL_MS = 10_000;

export class SyncEngine {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(
    private readonly queue: IEventQueue,
    private readonly notionLogs: NotionLogsAdapter,
    private readonly notionTodos: NotionTodosAdapter
  ) {}

  start(): void {
    if (this.intervalHandle !== null) return;
    const handle = setInterval(() => {
      this.flush().catch((err) =>
        console.error('[SyncEngine] flush error:', err instanceof Error ? err.message : String(err))
      );
    }, SYNC_INTERVAL_MS);
    // Allow the process to exit even if the interval is still active
    handle.unref();
    this.intervalHandle = handle;
  }

  stop(): void {
    if (this.intervalHandle === null) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
  }

  nudge(): void {
    setImmediate(() => {
      this.flush().catch((err) =>
        console.error('[SyncEngine] flush error:', err instanceof Error ? err.message : String(err))
      );
    });
  }

  async flush(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      await this.processPendingEvents();
    } finally {
      this.isFlushing = false;
    }
  }

  private async processPendingEvents(): Promise<void> {
    const pendingEvents = this.queue.pendingSync();
    if (pendingEvents.length === 0) return;

    // Load persisted mappings from the queue, then maintain a mutable batch map
    // that is updated immediately when a todo.created syncs within this flush.
    // This ensures subsequent events in the same batch resolve the correct Notion
    // page id rather than the local UUID (EntityIdMap is a point-in-time snapshot).
    const persistedMap = this.queue.getEntityIdMap();
    const batchIdMap = new Map<string, string>();

    const resolveId = (localId: string): string =>
      batchIdMap.get(localId) ?? persistedMap.getNotionId(localId) ?? localId;

    const syncedIds: string[] = [];

    for (const event of pendingEvents) {
      try {
        const resolvedEntityId = resolveId(event.entity_id);

        // New todos have no Notion page yet — skip conflict check and go straight to create.
        const hasPersistedNotionId =
          batchIdMap.has(event.entity_id) || persistedMap.has(event.entity_id);
        const isNewUnsyncedTodo =
          event.entity_type === EntityType.Todo &&
          event.event_type === EventType.TodoCreated &&
          !hasPersistedNotionId;

        if (!isNewUnsyncedTodo) {
          const notionLastEditedTime = await this.fetchLastEditedTime(
            event.entity_type,
            resolvedEntityId
          );
          if (notionLastEditedTime !== null && event.timestamp < notionLastEditedTime) {
            // Event is stale — Notion already has a newer version from another device
            syncedIds.push(event.id);
            continue;
          }
        }

        // TodoCreated with an existing mapping = already synced (crash-recovery path:
        // app crashed after mapping was persisted but before markSynced ran).
        // Skip to avoid creating a duplicate Notion page.
        if (
          event.entity_type === EntityType.Todo &&
          event.event_type === EventType.TodoCreated &&
          hasPersistedNotionId
        ) {
          syncedIds.push(event.id);
          continue;
        }

        await this.applyEventToNotion(event, resolvedEntityId, batchIdMap);
        syncedIds.push(event.id);
      } catch (err) {
        // Stop processing on first Notion error — retry next interval
        console.error(
          '[SyncEngine] Notion error, stopping batch:',
          err instanceof Error ? err.message : String(err)
        );
        break;
      }
    }

    if (syncedIds.length > 0) {
      this.queue.markSynced(syncedIds);
    }
  }

  private async fetchLastEditedTime(
    entityType: StoredEvent['entity_type'],
    notionId: string
  ): Promise<string | null> {
    try {
      if (entityType === EntityType.DailyLog) {
        // findByDate returns null when the log doesn't exist in Notion yet.
        // Returning null forces the event to be applied — correct default for new logs.
        const log = await this.notionLogs.findByDate(notionId);
        if (!log?.id) return null;
        return await this.notionLogs.fetchLastEditedTime(log.id);
      } else {
        return await this.notionTodos.fetchLastEditedTime(notionId);
      }
    } catch {
      // If we can't fetch, treat as "apply" — safe default per design constraints
      return null;
    }
  }

  private async applyEventToNotion(
    event: StoredEvent,
    resolvedEntityId: string,
    batchIdMap: Map<string, string>
  ): Promise<void> {
    switch (event.event_type) {
      case EventType.TodoCreated:
        await this.syncTodoCreated(event, batchIdMap);
        break;
      case EventType.TodoUpdated:
        await this.syncTodoUpdated(event, resolvedEntityId);
        break;
      case EventType.TodoCompleted:
        await this.notionTodos.complete(resolvedEntityId);
        break;
      case EventType.TodoDeleted:
        await this.notionTodos.delete(resolvedEntityId);
        break;
      case EventType.DailyLogUpserted:
        await this.syncDailyLogUpserted(event);
        break;
    }
  }

  private async syncTodoCreated(
    event: StoredEvent,
    batchIdMap: Map<string, string>
  ): Promise<void> {
    const payload = event.payload as TodoCreatedPayload;
    const todo = createTodo(
      payload.title,
      payload.dueDate ?? null,
      event.entity_id,
      payload.status,
      {
        category: payload.category,
        notes: payload.notes,
        priority: payload.priority,
      }
    );
    const created = await this.notionTodos.add(todo);
    // Persist the local UUID → Notion page id mapping, then record it in the
    // batch map so subsequent events in this flush resolve the correct id.
    this.queue.persistEntityIdMapping(event.entity_id, created.id);
    batchIdMap.set(event.entity_id, created.id);
  }

  private async syncTodoUpdated(event: StoredEvent, notionId: string): Promise<void> {
    const { patch } = event.payload as { patch: Parameters<NotionTodosAdapter['update']>[1] };
    await this.notionTodos.update(notionId, patch);
  }

  private async syncDailyLogUpserted(event: StoredEvent): Promise<void> {
    const payload = event.payload as DailyLogUpsertedPayload;
    const content = createLogContent(payload.title, payload.notes ?? '', {
      score: payload.score,
      mood: payload.mood,
      energy: payload.energy,
      deepWorkHours: payload.deepWorkHours,
      workout: payload.workout,
      diet: payload.diet,
      readingMins: payload.readingMins,
      wentWell: payload.wentWell,
      improve: payload.improve,
      gratitude: payload.gratitude,
      tomorrow: payload.tomorrow,
    });
    const log = createDailyLog(event.entity_id, content);
    await this.notionLogs.save(log);
  }
}
