import type { ITodosRepository } from '../../../application/ports/todos-repository';
import type { TodoUpdatePatch } from '../../../application/ports/todo-update-patch';
import type { Todo, TodoStatus } from '../../../domain/entities/todo';
import type { TodoId } from '../../../domain/value-objects/todo-id';
import { createTodo } from '../../../domain/entities/todo';
import mockDataJson from '../../../../fixtures/mock-data.json';

/**
 * Mock Todos Adapter - Returns sanitized data from fixtures
 * Use this for visual testing without external API calls
 */
export class MockTodosAdapter implements ITodosRepository {
  private mockData = mockDataJson;

  private toTodo(raw: (typeof mockDataJson.tasks)[number]): Todo {
    return createTodo(
      raw.title,
      raw.dueDate ?? null,
      raw.id,
      raw.status as TodoStatus,
      {
        category: raw.category as Todo['category'],
        notes: raw.notes ?? undefined,
        priority: raw.priority as Todo['priority'],
      }
    );
  }

  async listAll(): Promise<Todo[]> {
    return this.mockData.tasks.map(t => this.toTodo(t));
  }

  async listOpen(): Promise<Todo[]> {
    return this.mockData.tasks
      .filter(t => t.status === 'Todo' || t.status === 'In Progress')
      .map(t => this.toTodo(t));
  }

  async add(todo: Todo): Promise<Todo> {
    console.log('[MockTodosAdapter] add called (no-op):', todo.title);
    return todo;
  }

  async complete(id: TodoId): Promise<void> {
    console.log('[MockTodosAdapter] complete called (no-op):', id);
  }

  async update(id: TodoId, patch: TodoUpdatePatch): Promise<void> {
    console.log('[MockTodosAdapter] update called (no-op):', id, patch);
  }

  async delete(id: TodoId): Promise<void> {
    console.log('[MockTodosAdapter] delete called (no-op):', id);
  }
}
