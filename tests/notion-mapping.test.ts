/**
 * Test that Notion DB mapping (IDs + columns) is correct.
 * Loads NOTION_* from env (e.g. .env); validates both DBs and column names exist.
 * Run: npm run test:notion-mapping   or   npm run ping
 */
import {
  loadNotionConfig,
  getNotionClient,
  validateNotionMapping,
} from '../src/adapters/outbound/notion/client';

async function main(): Promise<void> {
  const config = loadNotionConfig();
  const client = getNotionClient(config.apiKey);
  await validateNotionMapping(config, client);
  console.log('OK – Logs and TODOs DBs and column mapping are valid');
  console.log('Logs columns:', config.db.logs.columns);
  console.log('TODOs columns:', config.db.todos.columns);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
