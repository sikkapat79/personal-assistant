import type { Todo, TodoCategory, TodoPriority } from '../../domain/entities/Todo';
import type { TodoId } from '../../domain/value-objects/TodoId';

export interface TodoUpdatePatch {
  title?: string;
  dueDate?: string | null;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
}

export interface ITodosRepository {
  listOpen(): Promise<Todo[]>;
  listAll(): Promise<Todo[]>;
  add(todo: Todo): Promise<Todo>;
  complete(id: TodoId): Promise<void>;
  update(id: TodoId, patch: TodoUpdatePatch): Promise<void>;
  delete(id: TodoId): Promise<void>;
}
