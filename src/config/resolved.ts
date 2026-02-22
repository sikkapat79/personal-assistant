import { loadProfile } from './profile';
import { loadSettings } from './settings';
import type { Settings } from './settings';

/** Merged settings: env overrides file. */
function mergedSettings(): Settings {
  const file = loadSettings();
  return {
    NOTION_API_KEY: process.env.NOTION_API_KEY ?? file.NOTION_API_KEY,
    NOTION_LOGS_DATABASE_ID:
      process.env.NOTION_LOGS_DATABASE_ID ?? file.NOTION_LOGS_DATABASE_ID,
    NOTION_TODOS_DATABASE_ID:
      process.env.NOTION_TODOS_DATABASE_ID ?? file.NOTION_TODOS_DATABASE_ID,
    NOTION_LOGS_TITLE: process.env.NOTION_LOGS_TITLE ?? file.NOTION_LOGS_TITLE,
    NOTION_LOGS_DATE: process.env.NOTION_LOGS_DATE ?? file.NOTION_LOGS_DATE,
    NOTION_LOGS_SCORE: process.env.NOTION_LOGS_SCORE ?? file.NOTION_LOGS_SCORE,
    NOTION_LOGS_MOOD: process.env.NOTION_LOGS_MOOD ?? file.NOTION_LOGS_MOOD,
    NOTION_LOGS_ENERGY: process.env.NOTION_LOGS_ENERGY ?? file.NOTION_LOGS_ENERGY,
    NOTION_LOGS_DEEP_WORK_HOURS:
      process.env.NOTION_LOGS_DEEP_WORK_HOURS ?? file.NOTION_LOGS_DEEP_WORK_HOURS,
    NOTION_LOGS_WORKOUT: process.env.NOTION_LOGS_WORKOUT ?? file.NOTION_LOGS_WORKOUT,
    NOTION_LOGS_DIET: process.env.NOTION_LOGS_DIET ?? file.NOTION_LOGS_DIET,
    NOTION_LOGS_READING_MINS:
      process.env.NOTION_LOGS_READING_MINS ?? file.NOTION_LOGS_READING_MINS,
    NOTION_LOGS_WENT_WELL:
      process.env.NOTION_LOGS_WENT_WELL ?? file.NOTION_LOGS_WENT_WELL,
    NOTION_LOGS_IMPROVE: process.env.NOTION_LOGS_IMPROVE ?? file.NOTION_LOGS_IMPROVE,
    NOTION_LOGS_GRATITUDE:
      process.env.NOTION_LOGS_GRATITUDE ?? file.NOTION_LOGS_GRATITUDE,
    NOTION_LOGS_TOMORROW:
      process.env.NOTION_LOGS_TOMORROW ?? file.NOTION_LOGS_TOMORROW,
    NOTION_TODOS_TITLE: process.env.NOTION_TODOS_TITLE ?? file.NOTION_TODOS_TITLE,
    NOTION_TODOS_CATEGORY:
      process.env.NOTION_TODOS_CATEGORY ?? file.NOTION_TODOS_CATEGORY,
    NOTION_TODOS_DUE_DATE:
      process.env.NOTION_TODOS_DUE_DATE ?? file.NOTION_TODOS_DUE_DATE,
    NOTION_TODOS_NOTES: process.env.NOTION_TODOS_NOTES ?? file.NOTION_TODOS_NOTES,
    NOTION_TODOS_PRIORITY:
      process.env.NOTION_TODOS_PRIORITY ?? file.NOTION_TODOS_PRIORITY,
    NOTION_TODOS_STATUS: process.env.NOTION_TODOS_STATUS ?? file.NOTION_TODOS_STATUS,
    NOTION_TODOS_DONE_VALUE:
      process.env.NOTION_TODOS_DONE_VALUE ?? file.NOTION_TODOS_DONE_VALUE,
    NOTION_TODOS_OPEN_VALUE:
      process.env.NOTION_TODOS_OPEN_VALUE ?? file.NOTION_TODOS_OPEN_VALUE,
    NOTION_TODOS_IN_PROGRESS_VALUE:
      process.env.NOTION_TODOS_IN_PROGRESS_VALUE ?? file.NOTION_TODOS_IN_PROGRESS_VALUE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? file.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? file.OPENAI_MODEL,
  };
}

export interface ResolvedConfig {
  profile: ReturnType<typeof loadProfile>;
  settings: Settings;
}

/**
 * Returns merged config: profile from file (with defaults), settings from env + file (env overrides).
 */
export function getResolvedConfig(): ResolvedConfig {
  return {
    profile: loadProfile(),
    settings: mergedSettings(),
  };
}

/**
 * True if required Notion config is present (API key + both DB IDs).
 */
export function hasRequiredConfig(): boolean {
  const s = mergedSettings();
  return !!(
    s.NOTION_API_KEY &&
    s.NOTION_LOGS_DATABASE_ID &&
    s.NOTION_TODOS_DATABASE_ID
  );
}
