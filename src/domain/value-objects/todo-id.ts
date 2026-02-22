/** Identity for a Todo (e.g. Notion page id). */
export type TodoId = string;

export function createTodoId(id: string): TodoId {
  if (!id || !id.trim()) throw new Error('TodoId cannot be empty');
  return id.trim();
}
