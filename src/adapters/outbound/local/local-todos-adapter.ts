import type { ITodosRepository, TodoUpdatePatch } from '../../../application/ports/todos-repository';
import type { IEventQueue } from '../../../application/ports/event-queue';
import type { Todo } from '../../../domain/entities/todo';
import type { TodoId } from '../../../domain/value-objects/todo-id';
import type { StoredEvent, TodoCreatedPayload, TodoUpdatedPayload } from './event-types';
import { EntityType, EventType } from './event-types';
import { LocalAdapterBase } from './local-adapter-base';
import { LocalProjection } from './local-projection';
import { SyncEngine } from './sync-engine';
import { createTodo } from '../../../domain/entities/todo';

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
