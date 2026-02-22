/**
 * Test that we can get (fetch) logs and/or todos from Notion.
 * Loads NOTION_* from env; composes adapters and runs one read per DB.
 * Passes if at least one of logs or todos can be fetched.
 * Run: bun run test:notion-fetch
 */
import { compose } from '../src/composition';

async function main(): Promise<void> {
  const { logs, todos } = compose();

  let logsOk = false;
  let todosOk = false;

  try {
    const from = '2025-01-01';
    const to = '2025-12-31';
    const logList = await logs.findByDateRange(from, to);
    console.log('Logs:', logList.length, 'entries in range', from, '..', to);
    logsOk = true;
  } catch (err) {
    console.log('Logs: failed –', err instanceof Error ? err.message : err);
  }

  try {
    const todoList = await todos.listOpen();
    console.log('TODOs (open):', todoList.length);
    todosOk = true;
  } catch (err) {
    console.log('TODOs: failed –', err instanceof Error ? err.message : err);
  }

  if (logsOk || todosOk) {
    console.log('OK – can get', [logsOk && 'logs', todosOk && 'todos'].filter(Boolean).join(' and '));
    return;
  }
  throw new Error('Could not get logs or todos');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
