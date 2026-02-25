/**
 * Tests for FileMetadataStore: read/write, empty file → empty scope/schemas, version persisted.
 * Run: bun run test:file-metadata-store
 */
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileMetadataStore } from '../src/adapters/outbound/file-metadata-store';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'pax-meta-test-'));
  try {
    const store = new FileMetadataStore(tmpDir);

    // Empty store: no file yet → getAllowedNotionScope null, getCachedSchema null, getProvenance []
    assert(store.getAllowedNotionScope() === null, 'initial scope null');
    assert((await store.getCachedSchema('logs-db')) === null, 'initial schema null');
    assert((await store.getProvenance()).length === 0, 'initial provenance empty');

    // setAllowedNotionScope + setCachedSchema → persist; version in file
    await store.setAllowedNotionScope({
      logsDatabaseId: 'logs-id',
      todosDatabaseId: 'todos-id',
      logsPurpose: 'Daily journal',
      todosPurpose: 'Tasks',
    });
    await store.setCachedSchema('logs-id', {
      databaseId: 'logs-id',
      properties: [{ name: 'Title', notionType: 'title' }],
    });

    const scope = store.getAllowedNotionScope();
    assert(scope !== null, 'scope set');
    assert(scope!.logsDatabaseId === 'logs-id', 'scope logs id');
    assert(scope!.logsPurpose === 'Daily journal', 'scope logs purpose');

    const schema = await store.getCachedSchema('logs-id');
    assert(schema !== null, 'schema set');
    assert(schema!.properties[0]!.name === 'Title', 'schema property name');

    const filePath = join(tmpDir, 'metadata.json');
    assert(existsSync(filePath), 'file created');
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    assert(parsed.version === 1, 'version persisted');

    // recordProvenance + getProvenance
    await store.recordProvenance({
      id: 'page-1',
      type: 'page',
      createdByPaxAt: new Date().toISOString(),
    });
    const list = await store.getProvenance();
    assert(list.length === 1, 'provenance length');
    assert(list[0]!.type === 'page', 'provenance type');

    // getSyncState / setSyncState
    assert((await store.getSyncState('calendar')) === null, 'sync initial null');
    await store.setSyncState('calendar', { lastFetchedAt: '2024-01-01T00:00:00Z' });
    const sync = await store.getSyncState('calendar');
    assert(sync !== null && sync.lastFetchedAt === '2024-01-01T00:00:00Z', 'sync persisted');

    // New store instance reads same file
    const store2 = new FileMetadataStore(tmpDir);
    assert(store2.getAllowedNotionScope()?.logsDatabaseId === 'logs-id', 'reload scope');
    assert((await store2.getCachedSchema('logs-id')) !== null, 'reload schema');
    assert((await store2.getProvenance()).length === 1, 'reload provenance');

    console.log('file-metadata-store: all tests passed');
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
