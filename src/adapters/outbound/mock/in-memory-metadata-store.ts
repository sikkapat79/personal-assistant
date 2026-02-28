import type {
  ProvenanceEntry,
  SyncState,
  DatabaseSchema,
} from '../../../domain/metadata';
import type { AllowedNotionScope } from '../../../application/dto/metadata';
import type { IMetadataStore } from '../../../application/ports/metadata-store';

/**
 * In-memory implementation of IMetadataStore. No file I/O.
 * Use for mock composition so tests and visual runs do not mutate real user metadata on disk.
 */
export class InMemoryMetadataStore implements IMetadataStore {
  private provenance: ProvenanceEntry[] = [];
  private scope: AllowedNotionScope | null = null;
  private sync: Record<string, SyncState> = {};
  private schemas: Record<string, DatabaseSchema> = {};

  async recordProvenance(entry: ProvenanceEntry): Promise<void> {
    this.provenance.push(entry);
  }

  async getProvenance(filter?: { type?: 'page' | 'block'; parentId?: string }): Promise<ProvenanceEntry[]> {
    let list = this.provenance;
    if (filter?.type) list = list.filter((e) => e.type === filter.type);
    if (filter?.parentId !== undefined) list = list.filter((e) => e.parentId === filter.parentId);
    return list;
  }

  getAllowedNotionScope(): AllowedNotionScope | null {
    return this.scope;
  }

  async setAllowedNotionScope(scope: AllowedNotionScope): Promise<void> {
    this.scope = scope;
  }

  async getSyncState(key: string): Promise<SyncState | null> {
    return this.sync[key] ?? null;
  }

  async setSyncState(key: string, state: SyncState): Promise<void> {
    this.sync[key] = state;
  }

  async getCachedSchema(databaseId: string): Promise<DatabaseSchema | null> {
    return this.schemas[databaseId] ?? null;
  }

  async setCachedSchema(databaseId: string, schema: DatabaseSchema): Promise<void> {
    this.schemas[databaseId] = schema;
  }
}
