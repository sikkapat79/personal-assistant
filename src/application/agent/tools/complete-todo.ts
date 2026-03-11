import { TodosUseCase } from '@app/todo/todos-use-case';
import type { ToolDeps } from '../tool-deps';

export async function handleCompleteTodo(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const todosUseCase = new TodosUseCase(deps.todos);
  const idOrIndex = String(args.id_or_index ?? '');
  await todosUseCase.completeByIdOrIndex(idOrIndex);
  return 'Marked that task as done.';
}
