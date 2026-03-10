import type { TodoStatus } from '@domain/todo/todo';
import { TodosUseCase } from '@app/todo/todos-use-case';
import { parsePriority } from '../parse-priority';
import { parseCategory } from '../parse-category';
import { parseStatus } from '../parse-status';
import type { ToolDeps } from '../tool-deps';

export async function handleUpdateTodo(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  const idOrIndex = String(args.id_or_index ?? '');
  const patch: {
    title?: string;
    category?: ReturnType<typeof parseCategory>;
    dueDate?: string | null;
    notes?: string;
    priority?: ReturnType<typeof parsePriority>;
    status?: TodoStatus;
  } = {};
  if (args.title !== undefined && args.title !== '') patch.title = String(args.title);
  if (args.category !== undefined) patch.category = parseCategory(args.category);
  if (args.due_date !== undefined) patch.dueDate = args.due_date === '' ? null : String(args.due_date);
  if (args.notes !== undefined) patch.notes = String(args.notes);
  if (args.priority !== undefined) patch.priority = parsePriority(args.priority);
  if (args.status !== undefined) patch.status = parseStatus(args.status);
  if (Object.keys(patch).length === 0) return 'No changes given for that task.';
  await todosUseCase.updateByIdOrIndex(idOrIndex, patch);
  const parts = ['Updated that task'];
  if (patch.title) parts.push(`title to "${patch.title}"`);
  if (patch.category) parts.push(`category ${patch.category}`);
  if (patch.dueDate !== undefined) parts.push(patch.dueDate ? `due ${patch.dueDate}` : 'cleared due date');
  if (patch.notes !== undefined) parts.push('notes');
  if (patch.priority) parts.push(`priority ${patch.priority}`);
  if (patch.status) parts.push(`status ${patch.status}`);
  return parts.join('; ') + '.';
}
