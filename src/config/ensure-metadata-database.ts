import { loadSettings, saveSettings } from './settings';
import type { Settings } from './settings';
import type { NotionSettingsShape } from '../adapters/outbound/notion/client';
import { getNotionClient, createMetadataDatabaseUnderPage } from '../adapters/outbound/notion/client';

/**
 * Returns the Notion metadata database ID: from settings, or creates a new database
 * under NOTION_PAGES_PARENT_ID and saves the ID to settings.
 */
export async function getOrCreateMetadataDatabaseId(
  settings: NotionSettingsShape
): Promise<string | null> {
  const existing = settings.NOTION_METADATA_DATABASE_ID?.trim();
  if (existing) return existing;

  const apiKey = settings.NOTION_API_KEY?.trim();
  const parentPageId = settings.NOTION_PAGES_PARENT_ID?.trim();
  if (!apiKey || !parentPageId) return null;

  const databaseId = await createMetadataDatabaseUnderPage(apiKey, parentPageId);
  const current = loadSettings();
  (current as Settings).NOTION_METADATA_DATABASE_ID = databaseId;
  saveSettings(current);
  return databaseId;
}
