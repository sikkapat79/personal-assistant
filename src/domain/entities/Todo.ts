import type { TodoId } from '../value-objects/TodoId';
import type { TodoTitle } from '../value-objects/TodoTitle';
import type { TodoDueDate } from '../value-objects/TodoDueDate';
import { createTodoTitle } from '../value-objects/TodoTitle';
import { createTodoDueDate } from '../value-objects/TodoDueDate';

/** Aligned with Notion Status options: Todo, In Progress, Done. */
export type TodoStatus = 'Todo' | 'In Progress' | 'Done';

export type TodoCategory = 'Work' | 'Health' | 'Personal' | 'Learning';

/** Canonical priority values (Notion select). Inputs are normalized case-insensitively when parsing. */
export type TodoPriority = 'High' | 'Medium' | 'Low';

export const TODO_PRIORITIES: readonly TodoPriority[] = ['High', 'Medium', 'Low'];

/** Aggregate root: single task (identity = TodoId). */
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
