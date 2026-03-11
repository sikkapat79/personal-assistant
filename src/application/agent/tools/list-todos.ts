import { TodosUseCase } from '@app/todo/todos-use-case';
import type { ToolDeps } from '../tool-deps';

export async function handleListTodos(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  let list = args.include_done ? await todosUseCase.listAll() : await todosUseCase.listOpen();
  const forDate = typeof args.for_date === 'string' && args.for_date.trim() !== '' ? args.for_date.trim() : null;
  if (forDate) {
    list = list.filter((t) => t.dueDate === forDate);
  }
  if (list.length === 0) {
    if (forDate) {
      return args.include_done
        ? `No tasks due on ${forDate} (done or open).`
        : `No open tasks due on ${forDate}.`;
    }
    return args.include_done ? 'No TODOs in the list.' : 'No open tasks.';
  }
  const lines = list.map((t, i) => {
    const due = t.dueDate ? ` (due ${t.dueDate})` : '';
    const cat = t.category ? ` [${t.category}]` : '';
    const pri = t.priority ? ` [${t.priority}]` : '';
    const notesHint = t.notes ? ` — ${t.notes.slice(0, 40)}${t.notes.length > 40 ? '…' : ''}` : '';
    const status = args.include_done ? ` [${t.status}]` : '';
    return `${i + 1}. ${t.title}${due}${cat}${pri}${notesHint}${status}`;
  });
  const kind = args.include_done ? 'tasks' : 'open tasks';
  const scope = forDate ? ` due on ${forDate}` : '';
  return `${list.length} ${kind}${scope}:\n${lines.join('\n')}`;
}
