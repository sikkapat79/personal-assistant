import { TodosUseCase } from '../../todos-use-case';
import type { ToolDeps } from '../tool-deps';

export async function handleDeleteTodo(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  const idOrIndex = String(args.id_or_index ?? '');
  await todosUseCase.deleteByIdOrIndex(idOrIndex);
  return 'Deleted that task.';
}
