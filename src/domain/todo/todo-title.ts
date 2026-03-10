/** Immutable value object: non-empty task title. */
export type TodoTitle = string;

export function createTodoTitle(title: string): TodoTitle {
  const t = title.trim();
  if (!t) throw new Error('Todo title cannot be empty');
  return t;
}
