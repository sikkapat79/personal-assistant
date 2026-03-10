import type { ToolCall } from './tool-call';
import type { ToolDeps } from './tool-deps';
import { handleGetLogs } from './tools/get-logs';
import { handleApplyLogUpdate } from './tools/apply-log-update';
import { handleUpsertLog } from './tools/upsert-log';
import { handleListTodos } from './tools/list-todos';
import { handleAddTodo } from './tools/add-todo';
import { handleAddTodos } from './tools/add-todos';
import { handleUpdateTodo } from './tools/update-todo';
import { handleDeleteTodo } from './tools/delete-todo';
import { handleCompleteTodo } from './tools/complete-todo';
import { handleGetSchema } from './tools/get-schema';

export type { ToolDeps } from './tool-deps';

type ToolHandler = (args: Record<string, unknown>, deps: ToolDeps) => Promise<string>;

const HANDLERS: Record<string, ToolHandler> = {
  get_logs: handleGetLogs,
  apply_log_update: handleApplyLogUpdate,
  upsert_log: handleUpsertLog,
  list_todos: handleListTodos,
  add_todo: handleAddTodo,
  add_todos: handleAddTodos,
  update_todo: handleUpdateTodo,
  delete_todo: handleDeleteTodo,
  complete_todo: handleCompleteTodo,
  get_schema: handleGetSchema,
};

export async function executeTools(
  calls: ToolCall[],
  deps: ToolDeps
): Promise<{ name: string; result: string }[]> {
  const out: { name: string; result: string }[] = [];
  for (const call of calls) {
    try {
      const handler = HANDLERS[call.name];
      const result = handler
        ? await handler(call.args, deps)
        : "That tool isn't available.";
      out.push({ name: call.name, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      out.push({ name: call.name, result: 'Error: ' + msg });
    }
  }
  return out;
}
