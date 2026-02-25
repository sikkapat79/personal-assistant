/**
 * Tests for ensureMetadataBootstrapped: from settings produces scope and cached schemas;
 * missing required settings leave store empty without throwing.
 * Run: bun run test:metadata-bootstrap
 */
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileMetadataStore } from '../src/adapters/outbound/file-metadata-store';
import { ensureMetadataBootstrapped } from '../src/config/metadata-bootstrap';
import type { NotionSettingsShape } from '../src/adapters/outbound/notion/client';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'pax-bootstrap-test-'));
  try {
    // Missing NOTION_LOGS_DATABASE_ID / NOTION_TODOS_DATABASE_ID: bootstrap does nothing, no throw
    const storeEmpty = new FileMetadataStore(tmpDir);
    const emptySettings: NotionSettingsShape = {
      NOTION_API_KEY: 'key',
      NOTION_LOGS_TITLE: 'Title',
    };
    await ensureMetadataBootstrapped(storeEmpty, emptySettings);
    assert(storeEmpty.getAllowedNotionScope() === null, 'missing DB IDs → scope stays null');

    // Use a second temp dir for the full bootstrap test so we start fresh
    const tmpDir2 = mkdtempSync(join(tmpdir(), 'pax-bootstrap-test2-'));
    try {
      const store = new FileMetadataStore(tmpDir2);
      const fullSettings: NotionSettingsShape = {
        NOTION_API_KEY: 'key',
        NOTION_LOGS_DATABASE_ID: 'logs-db-id',
        NOTION_TODOS_DATABASE_ID: 'todos-db-id',
        NOTION_LOGS_TITLE: 'Log Title',
        NOTION_LOGS_DATE: 'Date',
        NOTION_PAGES_PARENT_ID: 'parent-page-id',
      };
      await ensureMetadataBootstrapped(store, fullSettings);

      const scope = store.getAllowedNotionScope();
      assert(scope !== null, 'scope set');
      assert(scope!.logsDatabaseId === 'logs-db-id', 'logsDatabaseId');
      assert(scope!.todosDatabaseId === 'todos-db-id', 'todosDatabaseId');
      assert(scope!.logsPurpose === 'Daily journal', 'logsPurpose');
      assert(scope!.todosPurpose === 'Tasks', 'todosPurpose');
      assert(
        scope!.allowedPageParentIds?.includes('parent-page-id'),
        'allowedPageParentIds from NOTION_PAGES_PARENT_ID'
      );
      assert(scope!.logsColumns !== undefined, 'logsColumns set');
      assert(scope!.todosColumns !== undefined, 'todosColumns set');
      assert(scope!.todosDoneKind !== undefined, 'todosDoneKind set');

      const logsSchema = await store.getCachedSchema('logs-db-id');
      assert(logsSchema !== null, 'logs schema cached');
      assert(logsSchema!.properties.length > 0, 'logs schema has properties');

      const todosSchema = await store.getCachedSchema('todos-db-id');
      assert(todosSchema !== null, 'todos schema cached');
      assert(todosSchema!.properties.length > 0, 'todos schema has properties');

      // Second bootstrap with same store: should not overwrite (scope already present)
      await ensureMetadataBootstrapped(store, fullSettings);
      const scope2 = store.getAllowedNotionScope();
      assert(scope2!.logsDatabaseId === 'logs-db-id', 'idempotent bootstrap');
    } finally {
      rmSync(tmpDir2, { recursive: true });
    }

    console.log('metadata-bootstrap: all tests passed');
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
