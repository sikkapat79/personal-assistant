import { TodosUseCase } from '@app/todo/todos-use-case';
import type { ToolDeps } from '../tool-deps';

export async function handleDeleteTodo(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  if (args.confirmed !== true) {
    return 'Deletion not confirmed. Pass confirmed: true in the delete_todo call only after the user has explicitly agreed.';
  }
  const todosUseCase = new TodosUseCase(deps.todos);
  const idOrIndex = String(args.id_or_index ?? '');
  await todosUseCase.deleteByIdOrIndex(idOrIndex);
  return 'Deleted that task.';
}
