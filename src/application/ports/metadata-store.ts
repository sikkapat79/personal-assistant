import type {
  ProvenanceEntry,
  SyncState,
  DatabaseSchema,
} from '../../domain/metadata';
import type { AllowedNotionScope } from '../dto/metadata';

export interface IMetadataStore {
  recordProvenance(entry: ProvenanceEntry): Promise<void>;
  getProvenance(filter?: { type?: 'page' | 'block'; parentId?: string }): Promise<ProvenanceEntry[]>;
  getAllowedNotionScope(): AllowedNotionScope | null;
  setAllowedNotionScope(scope: AllowedNotionScope): Promise<void>;
  getSyncState(key: string): Promise<SyncState | null>;
  setSyncState(key: string, state: SyncState): Promise<void>;
  getCachedSchema(databaseId: string): Promise<DatabaseSchema | null>;
  setCachedSchema(databaseId: string, schema: DatabaseSchema): Promise<void>;
}
