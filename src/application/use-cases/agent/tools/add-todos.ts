import { TodosUseCase } from '../../todos-use-case';
import { parsePriority } from '../parse-priority';
import { parseCategory } from '../parse-category';
import { parseStatus } from '../parse-status';
import type { ToolDeps } from '../tool-deps';

export async function handleAddTodos(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  const raw = args.tasks;
  const tasks = Array.isArray(raw) ? raw : [];
  const results: string[] = [];
  for (const t of tasks) {
    if (t && typeof t === 'object' && 'title' in t) {
      const title = String((t as { title?: unknown }).title ?? '');
      const category = parseCategory((t as { category?: unknown }).category);
      const dueDate = (t as { due_date?: unknown }).due_date
        ? String((t as { due_date: unknown }).due_date)
        : null;
      const notes = (t as { notes?: unknown }).notes !== undefined && (t as { notes: unknown }).notes !== ''
        ? String((t as { notes: unknown }).notes)
        : undefined;
      const priority = parsePriority((t as { priority?: unknown }).priority);
      const status = parseStatus((t as { status?: unknown }).status);
      if (title) {
        await todosUseCase.add({ title, category, dueDate, notes, priority, status });
        const extra: string[] = [];
        if (status !== 'Todo') extra.push(status);
        if (dueDate) extra.push(`due ${dueDate}`);
        if (notes) extra.push('notes');
        if (priority) extra.push(priority);
        results.push(extra.length ? `"${title}" [${category}] (${extra.join(', ')})` : `"${title}" [${category}]`);
      }
    }
  }
  if (results.length === 0) return 'No valid tasks to add.';
  return `Added ${results.length} task${results.length === 1 ? '' : 's'}: ${results.join(', ')}.`;
}
