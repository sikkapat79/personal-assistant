import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from '../../config/config-dir';
import { getColumnPurpose } from './notion/notion-schema';
import type {
  ProvenanceEntry,
  SyncState,
  DatabaseSchema,
} from '../../domain/metadata';
import type { AllowedNotionScope } from '../../application/dto/metadata';
import type { IMetadataStore } from '../../application/ports/metadata-store';

const METADATA_VERSION = 1;
const FILENAME = 'metadata.json';

interface MetadataFile {
  version: number;
  provenance: ProvenanceEntry[];
  scope: AllowedNotionScope | null;
  sync: Record<string, SyncState>;
  schemas: Record<string, DatabaseSchema>;
}

function defaultFile(): MetadataFile {
  return {
    version: METADATA_VERSION,
    provenance: [],
    scope: null,
    sync: {},
    schemas: {},
  };
}

function metadataPath(): string {
  return join(getConfigDir(), FILENAME);
}

function loadFromPath(path: string): MetadataFile {
  if (!existsSync(path)) return defaultFile();
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MetadataFile>;
    return {
      version: parsed.version ?? METADATA_VERSION,
      provenance: Array.isArray(parsed.provenance) ? parsed.provenance : [],
      scope: parsed.scope ?? null,
      sync: parsed.sync && typeof parsed.sync === 'object' ? parsed.sync : {},
      schemas: parsed.schemas && typeof parsed.schemas === 'object' ? parsed.schemas : {},
    };
  } catch {
    return defaultFile();
  }
}

function saveToPath(path: string, data: MetadataFile): void {
  writeFileSync(path, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export class FileMetadataStore implements IMetadataStore {
  private data: MetadataFile | null = null;
  private readonly basePath: string;

  constructor(configDir?: string) {
    this.basePath = configDir ? join(configDir, FILENAME) : metadataPath();
  }

  private get path(): string {
    return this.basePath;
  }

  private ensureLoaded(): MetadataFile {
    if (this.data === null) this.data = loadFromPath(this.path);
    return this.data;
  }

  private persist(): void {
    if (this.data !== null) saveToPath(this.path, this.data);
  }

  async recordProvenance(entry: ProvenanceEntry): Promise<void> {
    const data = this.ensureLoaded();
    data.provenance.push(entry);
    this.persist();
  }

  async getProvenance(filter?: { type?: 'page' | 'block'; parentId?: string }): Promise<ProvenanceEntry[]> {
    const data = this.ensureLoaded();
    let list = data.provenance;
    if (filter?.type) list = list.filter((e) => e.type === filter.type);
    if (filter?.parentId !== undefined) list = list.filter((e) => e.parentId === filter.parentId);
    return list;
  }

  getAllowedNotionScope(): AllowedNotionScope | null {
    return this.ensureLoaded().scope;
  }

  async setAllowedNotionScope(scope: AllowedNotionScope): Promise<void> {
    const data = this.ensureLoaded();
    data.scope = scope;
    this.persist();
  }

  async getSyncState(key: string): Promise<SyncState | null> {
    const data = this.ensureLoaded();
    return data.sync[key] ?? null;
  }

  async setSyncState(key: string, state: SyncState): Promise<void> {
    const data = this.ensureLoaded();
    data.sync[key] = state;
    this.persist();
  }

  async getCachedSchema(databaseId: string): Promise<DatabaseSchema | null> {
    const data = this.ensureLoaded();
    let schema = data.schemas[databaseId] ?? null;
    // If scope says the todos "done" column is a Status, serve correct notionType even if stored as checkbox.
    const scope = data.scope;
    if (
      schema &&
      scope?.todosDatabaseId === databaseId &&
      scope.todosDoneKind?.type === 'status' &&
      scope.todosColumns?.done
    ) {
      const doneColumnName = scope.todosColumns.done;
      const donePurpose = getColumnPurpose('todos', 'done');
      schema = {
        ...schema,
        properties: schema.properties.map((p) =>
          p.name === doneColumnName
            ? { ...p, notionType: 'status', purpose: (p.purpose ?? donePurpose) || undefined }
            : p
        ),
      };
    }
    return schema;
  }

  async setCachedSchema(databaseId: string, schema: DatabaseSchema): Promise<void> {
    const data = this.ensureLoaded();
    data.schemas[databaseId] = schema;
    this.persist();
  }
}
