import type { TodoId } from '../value-objects/todo-id';
import type { TodoTitle } from '../value-objects/todo-title';
import type { TodoDueDate } from '../value-objects/todo-due-date';
import { createTodoTitle } from '../value-objects/todo-title';
import { createTodoDueDate } from '../value-objects/todo-due-date';

export type TodoStatus = 'Todo' | 'In Progress' | 'Done';
export type TodoCategory = 'Work' | 'Health' | 'Personal' | 'Learning';
export type TodoPriority = 'High' | 'Medium' | 'Low';
export const TODO_PRIORITIES: readonly TodoPriority[] = ['High', 'Medium', 'Low'];

export interface Todo {
  readonly id: TodoId;
  readonly title: TodoTitle;
  readonly dueDate: TodoDueDate;
  readonly status: TodoStatus;
  readonly category?: TodoCategory;
  readonly notes?: string;
  readonly priority?: TodoPriority;
}

export function createTodo(
  title: TodoTitle | string,
  dueDate?: TodoDueDate | string | null,
  id?: TodoId,
  status: TodoStatus = 'Todo',
  opts?: { category?: TodoCategory; notes?: string; priority?: TodoPriority }
): Todo {
  const t = typeof title === 'string' ? createTodoTitle(title) : title;
  const d = dueDate !== undefined ? createTodoDueDate(dueDate as string | null) : null;
  return {
    id: id ?? ('' as TodoId),
    title: t,
    dueDate: d,
    status,
    category: opts?.category,
    notes: opts?.notes,
    priority: opts?.priority,
  };
}

export function completeTodo(todo: Todo): Todo {
  if (todo.status === 'Done') return todo;
  return { ...todo, status: 'Done' as TodoStatus };
}
