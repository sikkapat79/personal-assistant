import type { Todo } from '../../domain/entities/todo';
import type { TodoId } from '../../domain/value-objects/todo-id';
import type { TodoUpdatePatch } from './todo-update-patch';

export type { TodoUpdatePatch } from './todo-update-patch';

export interface ITodosRepository {
  listOpen(): Promise<Todo[]>;
  listAll(): Promise<Todo[]>;
  add(todo: Todo): Promise<Todo>;
  complete(id: TodoId): Promise<void>;
  update(id: TodoId, patch: TodoUpdatePatch): Promise<void>;
  delete(id: TodoId): Promise<void>;
}
