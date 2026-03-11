/**
 * Metadata storage types: provenance, sync state, and cached schema.
 * Scope (AllowedNotionScope) lives in application/dto/metadata.ts so it can reference Notion column types.
 */

export interface ProvenanceEntry {
  id: string;
  type: 'page' | 'block';
  parentId?: string;
  createdByPaxAt: string;
  toolCallId?: string;
  sessionId?: string;
  updatedByPaxAt?: string;
  summary?: string;
}

export interface SyncState {
  lastFetchedAt?: string;
  lastEventId?: string;
  [k: string]: unknown;
}

export interface DatabaseSchemaProperty {
  name: string;
  notionType: string;
  /** Purpose of this column (what it stores). For humans and for Pax (agent context, prompts, tools). Single source of truth: notion-schema.ts. */
  purpose?: string;
}

export interface DatabaseSchema {
  databaseId: string;
  properties: DatabaseSchemaProperty[];
}
