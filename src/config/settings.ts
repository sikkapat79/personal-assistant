import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getConfigDir } from './config-dir';

/** Flat settings matching .env keys (Notion + OpenAI). Env overrides file. */
export interface Settings {
  NOTION_API_KEY?: string;
  NOTION_LOGS_DATABASE_ID?: string;
  NOTION_TODOS_DATABASE_ID?: string;
  NOTION_LOGS_TITLE?: string;
  NOTION_LOGS_DATE?: string;
  NOTION_LOGS_SCORE?: string;
  NOTION_LOGS_MOOD?: string;
  NOTION_LOGS_ENERGY?: string;
  NOTION_LOGS_DEEP_WORK_HOURS?: string;
  NOTION_LOGS_WORKOUT?: string;
  NOTION_LOGS_DIET?: string;
  NOTION_LOGS_READING_MINS?: string;
  NOTION_LOGS_WENT_WELL?: string;
  NOTION_LOGS_IMPROVE?: string;
  NOTION_LOGS_GRATITUDE?: string;
  NOTION_LOGS_TOMORROW?: string;
  NOTION_TODOS_TITLE?: string;
  NOTION_TODOS_CATEGORY?: string;
  NOTION_TODOS_DUE_DATE?: string;
  NOTION_TODOS_NOTES?: string;
  NOTION_TODOS_PRIORITY?: string;
  NOTION_TODOS_STATUS?: string;
  NOTION_TODOS_DONE_VALUE?: string;
  NOTION_TODOS_OPEN_VALUE?: string;
  NOTION_TODOS_IN_PROGRESS_VALUE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

const FILENAME = 'settings.json';

function settingsPath(): string {
  return join(getConfigDir(), FILENAME);
}

/**
 * Load settings from ~/.pa/settings.json. Returns {} for missing file.
 */
export function loadSettings(): Settings {
  const path = settingsPath();
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf-8');
    return (JSON.parse(raw) as Settings) || {};
  } catch {
    return {};
  }
}

/**
 * Save (non-secret) settings to ~/.pa/settings.json.
 * Caller may omit API keys to avoid writing secrets; file is chmod 600.
 */
export function saveSettings(settings: Partial<Settings>): void {
  const path = settingsPath();
  writeFileSync(path, JSON.stringify(settings, null, 2), { mode: 0o600 });
}
