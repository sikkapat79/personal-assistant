/**
 * Ensures mock composition uses InMemoryMetadataStore so mock runs never write to disk.
 * Run: bun run test:composition-mock
 */
import { composeMock } from '../src/composition-mock';
import { InMemoryMetadataStore } from '../src/adapters/outbound/mock/in-memory-metadata-store';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const composition = await composeMock();
  assert(
    composition.metadataStore instanceof InMemoryMetadataStore,
    'Mock composition must use InMemoryMetadataStore so tui:mock and tests do not write to ~/.pa/metadata.json'
  );
  console.log('OK: composeMock() uses InMemoryMetadataStore');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
