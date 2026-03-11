import type { ToolDeps } from '../tool-deps';

export async function handleGetSchema(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const databaseId = String(args.database_id ?? '');
  const schema = await deps.metadataStore.getCachedSchema(databaseId);
  if (!schema) return `No cached schema for database ${databaseId}.`;
  const lines = schema.properties.map((p) => `- ${p.name} (${p.notionType})`);
  return `Properties for ${databaseId}:\n${lines.join('\n')}`;
}
