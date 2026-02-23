import type { Client } from '@notionhq/client';
import type {
  ProvenanceEntry,
  SyncState,
  DatabaseSchema,
} from '../../../domain/metadata';
import type { AllowedNotionScope } from '../../../application/dto/metadata';
import type { IMetadataStore } from '../../../application/ports/metadata-store';
import { getColumnPurpose } from './notion-schema';

const TYPE_SCOPE = 'scope';
const TYPE_PROVENANCE = 'provenance';
const TYPE_SCHEMA = 'schema';
const TYPE_SYNC = 'sync';
const KEY_SCOPE = 'scope';

type NotionRichText = { type: 'text'; text: { content: string } };
type NotionTitle = { title: Array<{ type: 'text'; text: { content: string } }> };
type NotionSelect = { select: { name: string } };
type NotionProps = { Type: NotionSelect; Key: NotionTitle; Data: { rich_text: NotionRichText[] } };

function getRichTextContent(prop: unknown): string {
  if (!prop || typeof prop !== 'object' || !('rich_text' in prop)) return '';
  const rt = (prop as { rich_text: unknown }).rich_text;
  if (!Array.isArray(rt) || rt.length === 0) return '';
  const first = rt[0];
  return first && typeof first === 'object' && 'plain_text' in first
    ? String((first as { plain_text: string }).plain_text)
    : '';
}

function getTitleContent(prop: unknown): string {
  if (!prop || typeof prop !== 'object' || !('title' in prop)) return '';
  const t = (prop as { title: unknown }).title;
  if (!Array.isArray(t) || t.length === 0) return '';
  const first = t[0];
  return first && typeof first === 'object' && 'plain_text' in first
    ? String((first as { plain_text: string }).plain_text)
    : '';
}

function getSelectName(prop: unknown): string {
  if (!prop || typeof prop !== 'object' || !('select' in prop)) return '';
  const s = (prop as { select: unknown }).select;
  return s && typeof s === 'object' && 'name' in s ? String((s as { name: string }).name) : '';
}

/** Metadata store backed by a Notion database. Rows: Type (scope|provenance|schema|sync), Key (title), Data (rich_text JSON). */
export class NotionMetadataStore implements IMetadataStore {
  private scopeCache: AllowedNotionScope | null = null;
  private schemasCache: Record<string, DatabaseSchema> = {};
  private loaded = false;

  constructor(
    private readonly client: Client,
    private readonly databaseId: string
  ) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      page_size: 100,
    });
    for (const page of res.results) {
      if (page.object !== 'page' || !('properties' in page)) continue;
      const props = page.properties as Record<string, unknown>;
      const type = getSelectName(props.Type);
      const key = getTitleContent(props.Key);
      const dataStr = getRichTextContent(props.Data);
      if (!dataStr) continue;
      try {
        if (type === TYPE_SCOPE && key === KEY_SCOPE) {
          this.scopeCache = JSON.parse(dataStr) as AllowedNotionScope;
        } else if (type === TYPE_SCHEMA && key) {
          this.schemasCache[key] = JSON.parse(dataStr) as DatabaseSchema;
        }
      } catch {
        // skip invalid JSON
      }
    }
    this.loaded = true;
  }

  async recordProvenance(entry: ProvenanceEntry): Promise<void> {
    await this.client.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        Type: { select: { name: TYPE_PROVENANCE } },
        Key: { title: [{ text: { content: entry.id } }] },
        Data: { rich_text: [{ text: { content: JSON.stringify(entry).slice(0, 2000) } }] },
      } as NotionProps,
    });
  }

  async getProvenance(filter?: { type?: 'page' | 'block'; parentId?: string }): Promise<ProvenanceEntry[]> {
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: { property: 'Type', select: { equals: TYPE_PROVENANCE } },
      page_size: 100,
    });
    const list: ProvenanceEntry[] = [];
    for (const page of res.results) {
      if (page.object !== 'page' || !('properties' in page)) continue;
      const dataStr = getRichTextContent((page.properties as Record<string, unknown>).Data);
      try {
        const entry = JSON.parse(dataStr) as ProvenanceEntry;
        if (filter?.type && entry.type !== filter.type) continue;
        if (filter?.parentId !== undefined && entry.parentId !== filter.parentId) continue;
        list.push(entry);
      } catch {
        // skip
      }
    }
    return list;
  }

  getAllowedNotionScope(): AllowedNotionScope | null {
    return this.scopeCache;
  }

  async setAllowedNotionScope(scope: AllowedNotionScope): Promise<void> {
    this.scopeCache = scope;
    const dataStr = JSON.stringify(scope);
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          { property: 'Type', select: { equals: TYPE_SCOPE } },
          { property: 'Key', rich_text: { equals: KEY_SCOPE } },
        ],
      },
      page_size: 1,
    });
    const page = res.results[0];
    const payload = {
      Type: { select: { name: TYPE_SCOPE } },
      Key: { title: [{ text: { content: KEY_SCOPE } }] },
      Data: { rich_text: [{ text: { content: dataStr.slice(0, 2000) } }] },
    } as NotionProps;
    if (page && page.object === 'page') {
      await this.client.pages.update({ page_id: page.id, properties: payload });
    } else {
      await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: payload,
      });
    }
  }

  async getSyncState(key: string): Promise<SyncState | null> {
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          { property: 'Type', select: { equals: TYPE_SYNC } },
          { property: 'Key', title: { equals: key } },
        ],
      },
      page_size: 1,
    });
    const page = res.results[0];
    if (!page || page.object !== 'page' || !('properties' in page)) return null;
    const dataStr = getRichTextContent((page.properties as Record<string, unknown>).Data);
    try {
      return JSON.parse(dataStr) as SyncState;
    } catch {
      return null;
    }
  }

  async setSyncState(key: string, state: SyncState): Promise<void> {
    const dataStr = JSON.stringify(state);
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          { property: 'Type', select: { equals: TYPE_SYNC } },
          { property: 'Key', rich_text: { equals: key } },
        ],
      },
      page_size: 1,
    });
    const payload = {
      Type: { select: { name: TYPE_SYNC } },
      Key: { title: [{ text: { content: key } }] },
      Data: { rich_text: [{ text: { content: dataStr.slice(0, 2000) } }] },
    } as NotionProps;
    if (res.results[0] && res.results[0].object === 'page') {
      await this.client.pages.update({ page_id: res.results[0].id, properties: payload });
    } else {
      await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: payload,
      });
    }
  }

  async getCachedSchema(databaseId: string): Promise<DatabaseSchema | null> {
    await this.ensureLoaded();
    let schema = this.schemasCache[databaseId] ?? null;
    // If scope says the todos "done" column is a Status, serve correct notionType even if stored as checkbox.
    const scope = this.scopeCache;
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
    this.schemasCache[databaseId] = schema;
    const dataStr = JSON.stringify(schema);
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          { property: 'Type', select: { equals: TYPE_SCHEMA } },
          { property: 'Key', rich_text: { equals: databaseId } },
        ],
      },
      page_size: 1,
    });
    const payload = {
      Type: { select: { name: TYPE_SCHEMA } },
      Key: { title: [{ text: { content: databaseId } }] },
      Data: { rich_text: [{ text: { content: dataStr.slice(0, 2000) } }] },
    } as NotionProps;
    if (res.results[0] && res.results[0].object === 'page') {
      await this.client.pages.update({ page_id: res.results[0].id, properties: payload });
    } else {
      await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: payload,
      });
    }
  }

  /** Call after bootstrap so getAllowedNotionScope() and getCachedSchema() return cached values. */
  async loadFromNotion(): Promise<void> {
    this.loaded = false;
    this.scopeCache = null;
    this.schemasCache = {};
    await this.ensureLoaded();
  }
}
