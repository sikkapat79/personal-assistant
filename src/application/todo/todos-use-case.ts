import type { ITodosRepository, TodoUpdatePatch } from '@app/todo/todos-repository.port';
import type { Todo } from '@domain/todo/todo';
import type { TodoId } from '@domain/todo/todo-id';
import { createTodo } from '@domain/todo/todo';
import type { TodoItemDto, TodoAddInputDto } from '@app/todo/todo-dto';

export class TodosUseCase {
  constructor(private readonly todos: ITodosRepository) {}

  async listOpen(): Promise<TodoItemDto[]> {
    const list = await this.todos.listOpen();
    return list.map(toDto);
  }

  async listAll(): Promise<TodoItemDto[]> {
    const list = await this.todos.listAll();
    return list.map(toDto);
  }

  async listDoneToday(sinceUtc: string): Promise<TodoItemDto[]> {
    const list = await this.todos.listCompletedToday(sinceUtc);
    return list.map(toDto);
  }

  async add(input: TodoAddInputDto): Promise<TodoItemDto> {
    const todo = createTodo(input.title, input.dueDate ?? null, undefined, input.status ?? 'Todo', {
      category: input.category,
      notes: input.notes,
      priority: input.priority,
    });
    const saved = await this.todos.add(todo);
    return toDto(saved);
  }

  async complete(id: TodoId): Promise<void> {
    await this.todos.complete(id);
  }

  /** Complete by id or 1-based index in open list. */
  async completeByIdOrIndex(idOrIndex: string): Promise<void> {
    const id = await this.resolveIdOrIndex(idOrIndex);
    await this.todos.complete(id);
  }

  /** Update a task by id or 1-based index in open list. Only provided fields are changed. */
  async updateByIdOrIndex(idOrIndex: string, patch: TodoUpdatePatch): Promise<void> {
    const id = await this.resolveIdOrIndex(idOrIndex);
    await this.todos.update(id, patch);
  }

  /** Delete (archive) a task by id or 1-based index in open list. */
  async deleteByIdOrIndex(idOrIndex: string): Promise<void> {
    const id = await this.resolveIdOrIndex(idOrIndex);
    await this.todos.delete(id);
  }

  private async resolveIdOrIndex(idOrIndex: string): Promise<TodoId> {
    const trimmed = idOrIndex.trim();
    if (!trimmed) throw new Error('Invalid todo index or id: value is empty');
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (n >= 1) {
        const open = await this.todos.listOpen();
        const item = open[n - 1];
        if (!item) throw new Error(`No todo at index ${n}`);
        return item.id;
      }
    }
    return trimmed as TodoId;
  }
}

function toDto(t: Todo): TodoItemDto {
  return {
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    status: t.status,
    category: t.category,
    notes: t.notes,
    priority: t.priority,
  };
}
