import { TodosUseCase } from '@app/todo/todos-use-case';
import { parsePriority } from '../parse-priority';
import { parseCategory } from '../parse-category';
import { parseStatus } from '../parse-status';
import { DEFAULT_CATEGORY } from '../agent-constants';
import type { ToolDeps } from '../tool-deps';

export async function handleAddTodos(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  const raw = args.tasks;
  const tasks = Array.isArray(raw) ? raw : [];
  const validTasks = tasks.filter(
    (t): t is Record<string, unknown> =>
      t !== null && typeof t === 'object' && 'title' in t && String((t as { title?: unknown }).title ?? '').trim() !== ''
  );
  if (validTasks.length === 0) return 'No valid tasks to add.';
  const added: string[] = [];
  const failed: string[] = [];
  for (const t of validTasks) {
    const title = String((t as { title?: unknown }).title ?? '').trim();
    const category = parseCategory((t as { category?: unknown }).category) ?? DEFAULT_CATEGORY;
    const dueDate = (t as { due_date?: unknown }).due_date
      ? String((t as { due_date: unknown }).due_date)
      : null;
    const notes = (t as { notes?: unknown }).notes !== undefined && (t as { notes: unknown }).notes !== ''
      ? String((t as { notes: unknown }).notes)
      : undefined;
    const priority = parsePriority((t as { priority?: unknown }).priority);
    const status = parseStatus((t as { status?: unknown }).status) ?? 'Todo';
    try {
      await todosUseCase.add({ title, category, dueDate, notes, priority, status });
      const extra: string[] = [];
      if (status !== 'Todo') extra.push(status);
      if (dueDate) extra.push(`due ${dueDate}`);
      if (notes) extra.push('notes');
      if (priority) extra.push(priority);
      added.push(extra.length ? `"${title}" [${category}] (${extra.join(', ')})` : `"${title}" [${category}]`);
    } catch (err) {
      failed.push(`"${title}" — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const parts: string[] = [];
  if (added.length > 0) parts.push(`Added ${added.length} task${added.length === 1 ? '' : 's'}: ${added.join(', ')}.`);
  if (failed.length > 0) parts.push(`Failed ${failed.length}: ${failed.join(', ')}.`);
  return parts.join(' ');
}
