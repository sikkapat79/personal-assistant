import type { IMetadataStore } from '@app/shared/metadata-store.port';

/** Build a compact "Databases and properties" summary from metadata store for the system prompt. Includes column purpose so Pax knows what each field is for. */
export async function buildSchemaSummary(store: IMetadataStore): Promise<string | null> {
  const scope = store.getAllowedNotionScope();
  if (!scope) return null;
  const dbIds: { id: string; label: string }[] = [];
  if (scope.logsDatabaseId) dbIds.push({ id: scope.logsDatabaseId, label: scope.logsPurpose ?? 'Logs' });
  if (scope.todosDatabaseId) dbIds.push({ id: scope.todosDatabaseId, label: scope.todosPurpose ?? 'Todos' });
  if (scope.extraDatabaseIds?.length) {
    scope.extraDatabaseIds.forEach((id) => dbIds.push({ id, label: id }));
  }
  if (dbIds.length === 0) return null;
  const parts: string[] = [];
  for (const { id, label } of dbIds) {
    const schema = await store.getCachedSchema(id);
    if (schema?.properties?.length) {
      const props = schema.properties
        .map((p) => (p.purpose ? `${p.name} (${p.purpose})` : p.name))
        .join(', ');
      parts.push(`${label}: ${props}`);
    }
  }
  return parts.length > 0 ? parts.join('; ') : null;
}
