import { TodosUseCase } from '@app/todo/todos-use-case';
import { parsePriority } from '../parse-priority';
import { parseCategory } from '../parse-category';
import { parseStatus } from '../parse-status';
import { DEFAULT_CATEGORY } from '../agent-constants';
import type { ToolDeps } from '../tool-deps';

export async function handleAddTodo(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  const title = String(args.title ?? '');
  const category = parseCategory(args.category) ?? DEFAULT_CATEGORY;
  const dueDate = args.due_date ? String(args.due_date) : null;
  const notes = args.notes !== undefined && args.notes !== '' ? String(args.notes) : undefined;
  const priority = parsePriority(args.priority);
  const status = parseStatus(args.status) ?? 'Todo';
  await todosUseCase.add({ title, category, dueDate, notes, priority, status });
  const parts = [`Added "${title}" [${category}]`];
  if (status !== 'Todo') parts.push(status);
  if (dueDate) parts.push(`due ${dueDate}`);
  if (notes) parts.push('with notes');
  if (priority) parts.push(priority);
  return parts.join(', ') + '.';
}
