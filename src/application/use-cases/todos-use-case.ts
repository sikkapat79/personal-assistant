import type { ITodosRepository, TodoUpdatePatch } from '../ports/ITodosRepository';
import type { Todo } from '../../domain/entities/todo';
import type { TodoId } from '../../domain/value-objects/todo-id';
import { createTodo } from '../../domain/entities/todo';
import type { TodoItemDto, TodoAddInputDto } from '../dto/todo-dto';

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
    const n = parseInt(idOrIndex, 10);
    if (!Number.isNaN(n) && n >= 1) {
      const open = await this.todos.listOpen();
      const item = open[n - 1];
      if (!item) throw new Error(`No todo at index ${n}`);
      return item.id;
    }
    return idOrIndex as TodoId;
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
