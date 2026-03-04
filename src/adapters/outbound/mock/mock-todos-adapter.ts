import type { ITodosRepository } from '../../../application/ports/todos-repository';
import type { TodoUpdatePatch } from '../../../application/ports/todo-update-patch';
import type { Todo, TodoStatus, TodoCategory, TodoPriority } from '../../../domain/entities/todo';
import type { TodoId } from '../../../domain/value-objects/todo-id';
import { createTodo } from '../../../domain/entities/todo';
import mockDataJson from '../../../../fixtures/mock-data.json';

const VALID_STATUSES: TodoStatus[] = ['Todo', 'In Progress', 'Done'];
const VALID_CATEGORIES: TodoCategory[] = ['Work', 'Health', 'Personal', 'Learning'];
const VALID_PRIORITIES: TodoPriority[] = ['High', 'Medium', 'Low'];

/**
 * Mock Todos Adapter - Returns sanitized data from fixtures.
 * Maintains an in-memory mutable copy so status changes are reflected
 * during visual testing without external API calls.
 */
export class MockTodosAdapter implements ITodosRepository {
  private todos: Todo[];

  constructor() {
    this.todos = mockDataJson.tasks.map(raw => this.toTodo(raw));
  }

  private toTodo(raw: (typeof mockDataJson.tasks)[number]): Todo {
    const status = this.parseStatus(raw);
    const category = this.parseCategory(raw);
    const priority = this.parsePriority(raw);

    return createTodo(raw.title, raw.dueDate ?? null, raw.id, status, {
      category,
      notes: raw.notes ?? undefined,
      priority,
    });
  }

  private parseStatus(raw: (typeof mockDataJson.tasks)[number]): TodoStatus {
    if (!raw.status) return 'Todo';
    if (VALID_STATUSES.includes(raw.status as TodoStatus)) return raw.status as TodoStatus;
    throw new Error(
      `Invalid fixture: task "${raw.id}" has status "${raw.status}" (expected: ${VALID_STATUSES.join(', ')})`
    );
  }

  private parseCategory(raw: (typeof mockDataJson.tasks)[number]): TodoCategory | undefined {
    if (raw.category == null) return undefined;
    if (VALID_CATEGORIES.includes(raw.category as TodoCategory)) return raw.category as TodoCategory;
    throw new Error(
      `Invalid fixture: task "${raw.id}" has category "${raw.category}" (expected: ${VALID_CATEGORIES.join(', ')})`
    );
  }

  private parsePriority(raw: (typeof mockDataJson.tasks)[number]): TodoPriority | undefined {
    if (raw.priority == null) return undefined;
    if (VALID_PRIORITIES.includes(raw.priority as TodoPriority)) return raw.priority as TodoPriority;
    throw new Error(
      `Invalid fixture: task "${raw.id}" has priority "${raw.priority}" (expected: ${VALID_PRIORITIES.join(', ')})`
    );
  }

  async listAll(): Promise<Todo[]> {
    return [...this.todos];
  }

  async listOpen(): Promise<Todo[]> {
    return this.todos.filter(t => t.status !== 'Done');
  }

  async add(todo: Todo): Promise<Todo> {
    this.todos.push(todo);
    return todo;
  }

  async complete(id: TodoId): Promise<void> {
    const idx = this.todos.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.todos[idx] = { ...this.todos[idx], status: 'Done' };
    }
  }

  async update(id: TodoId, patch: TodoUpdatePatch): Promise<void> {
    const idx = this.todos.findIndex(t => t.id === id);
    if (idx !== -1) {
      const existing = this.todos[idx];
      this.todos[idx] = createTodo(
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
    }
  }

  async delete(id: TodoId): Promise<void> {
    this.todos = this.todos.filter(t => t.id !== id);
  }
}
