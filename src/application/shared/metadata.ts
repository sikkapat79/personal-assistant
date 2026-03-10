/**
 * Re-exports of application-layer metadata types for convenience.
 * Domain-level storage types (ProvenanceEntry, SyncState, DatabaseSchema) live in @domain/shared/metadata.
 * Notion-specific scope (AllowedNotionScope) lives in @adapters/outbound/notion/client.
 */
export type { ProvenanceEntry, SyncState, DatabaseSchema } from '@domain/shared/metadata';
