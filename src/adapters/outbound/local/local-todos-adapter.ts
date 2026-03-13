import type { ITodosRepository, TodoUpdatePatch } from '@app/todo/todos-repository.port';
import type { IEventQueue } from '@app/shared/event-queue.port';
import type { Todo } from '@domain/todo/todo';
import type { TodoId } from '@domain/todo/todo-id';
import type { StoredEvent, TodoCreatedPayload, TodoUpdatedPayload } from './event-types';
import { EntityType, EventType } from './event-types';
import { LocalAdapterBase } from './local-adapter-base';
import { LocalProjection } from './local-projection';
import { SyncEngine } from './sync-engine';
import { createTodo } from '@domain/todo/todo';

export class LocalTodosAdapter extends LocalAdapterBase implements ITodosRepository {
  constructor(
    queue: IEventQueue,
    projection: LocalProjection,
    sync: SyncEngine,
    deviceId: string
  ) {
    super(queue, projection, sync, EntityType.Todo, deviceId);
    this.registerHandlers(projection);
  }

  private registerHandlers(projection: LocalProjection): void {
    projection.register(EventType.TodoCreated, (event) => applyTodoCreated(projection, event));
    projection.register(EventType.TodoUpdated, (event) => applyTodoUpdated(projection, event));
    projection.register(EventType.TodoCompleted, (event) => applyTodoCompleted(projection, event));
    projection.register(EventType.TodoDeleted, (event) => projection.todos.delete(event.entity_id));
  }

  async listOpen(): Promise<Todo[]> {
    return Array.from(this.projection.todos.values())
      .filter((todo) => todo.status !== 'Done')
      .map((todo) => ({ ...todo }));
  }

  async listAll(): Promise<Todo[]> {
    return Array.from(this.projection.todos.values()).map((todo) => ({ ...todo }));
  }

  async listCompletedToday(sinceUtc: string): Promise<Todo[]> {
    const ids = this.queue.listCompletedTodayIds(sinceUtc);
    return ids
      .map((id) => {
        // Prefer live projection (task still in-memory after completion)
        const fromProjection = this.projection.todos.get(id);
        if (fromProjection) return fromProjection;
        // Fallback: rebuild from events (covers post-hydration or post-sync cases)
        return rebuildTodoFromEvents(this.queue.getEventsForEntity(id));
      })
      .filter((t): t is Todo => t !== undefined);
  }

  async add(todo: Todo): Promise<Todo> {
    const localId = Bun.randomUUIDv7();
    const payload: TodoCreatedPayload = {
      title: String(todo.title),
      dueDate: todo.dueDate ?? null,
      status: todo.status,
      category: todo.category,
      notes: todo.notes,
      priority: todo.priority,
    };
    this.write(localId, EventType.TodoCreated, payload);
    // Return the todo with the local UUID as its id
    const stored = this.projection.todos.get(localId);
    if (!stored) throw new Error(`[LocalTodosAdapter] projection missing todo after write — handler not registered`);
    return stored;
  }

  async complete(id: TodoId): Promise<void> {
    this.write(id, EventType.TodoCompleted, {});
  }

  async update(id: TodoId, patch: TodoUpdatePatch): Promise<void> {
    const payload: TodoUpdatedPayload = { patch };
    this.write(id, EventType.TodoUpdated, payload);
  }

  async delete(id: TodoId): Promise<void> {
    this.write(id, EventType.TodoDeleted, {});
  }
}

function rebuildTodoFromEvents(events: StoredEvent[]): Todo | undefined {
  let todo: Todo | undefined;
  for (const event of events) {
    if (event.event_type === EventType.TodoCreated) {
      const p = event.payload as TodoCreatedPayload;
      todo = createTodo(p.title, p.dueDate ?? null, event.entity_id, p.status, {
        category: p.category,
        notes: p.notes,
        priority: p.priority,
      });
    } else if (event.event_type === EventType.TodoUpdated && todo) {
      const { patch } = event.payload as TodoUpdatedPayload;
      todo = createTodo(
        patch.title ?? todo.title,
        patch.dueDate !== undefined ? patch.dueDate : todo.dueDate,
        todo.id,
        patch.status ?? todo.status,
        {
          category: patch.category ?? todo.category,
          notes: patch.notes ?? todo.notes,
          priority: patch.priority ?? todo.priority,
        }
      );
    } else if (event.event_type === EventType.TodoCompleted && todo) {
      todo = createTodo(todo.title, todo.dueDate, todo.id, 'Done', {
        category: todo.category,
        notes: todo.notes,
        priority: todo.priority,
      });
    }
  }
  return todo;
}

function applyTodoCreated(projection: LocalProjection, event: StoredEvent): void {
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
  projection.todos.set(event.entity_id, todo);
}

function applyTodoUpdated(projection: LocalProjection, event: StoredEvent): void {
  const existing = projection.todos.get(event.entity_id);
  if (!existing) return;
  const { patch } = event.payload as TodoUpdatedPayload;
  const updated = createTodo(
    patch.title ?? existing.title,
    patch.dueDate !== undefined ? patch.dueDate : existing.dueDate,
    existing.id,
    patch.status ?? existing.status,
    {
      category: patch.category ?? existing.category,
      notes: patch.notes ?? existing.notes,
      priority: patch.priority ?? existing.priority,
    }
  );
  projection.todos.set(event.entity_id, updated);
}

function applyTodoCompleted(projection: LocalProjection, event: StoredEvent): void {
  const existing = projection.todos.get(event.entity_id);
  if (!existing) return;
  const completed = createTodo(
    existing.title,
    existing.dueDate,
    existing.id,
    'Done',
    {
      category: existing.category,
      notes: existing.notes,
      priority: existing.priority,
    }
  );
  projection.todos.set(event.entity_id, completed);
}
