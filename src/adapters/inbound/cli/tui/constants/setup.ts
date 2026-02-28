import { AGENT_NAME } from '../../../../../config/branding';
import type { Settings } from '../../../../../config/settings';

type SettingsStep = { type: 'settings'; key: keyof Settings; tab: string; label: string };
type ProfileStep = { type: 'profile'; key: 'displayName'; tab: string; label: string };
export type SetupStep = SettingsStep | ProfileStep;

export const SETUP_STEPS: SetupStep[] = [
  { type: 'profile', key: 'displayName', tab: 'Name', label: 'Your display name' },
  { type: 'settings', key: 'OPENAI_API_KEY', tab: 'OpenAI key', label: `OpenAI API key (optional, for ${AGENT_NAME})` },
  { type: 'settings', key: 'OPENAI_MODEL', tab: 'AI model', label: 'OpenAI model (optional, e.g. gpt-4o-mini)' },
  { type: 'settings', key: 'NOTION_API_KEY', tab: 'Notion key', label: 'Notion API key (from notion.so/my-integrations)' },
  { type: 'settings', key: 'NOTION_LOGS_DATABASE_ID', tab: 'Logs DB', label: 'Notion Logs database ID (from the database URL)' },
  { type: 'settings', key: 'NOTION_TODOS_DATABASE_ID', tab: 'TODOs DB', label: 'Notion TODOs database ID (from the database URL)' },
  { type: 'settings', key: 'NOTION_METADATA_DATABASE_ID', tab: 'Metadata DB', label: 'Notion Metadata database ID' },
];

/** Settings-only steps, used for the API Keys tab in settings page. */
export const SETTINGS_STEPS = SETUP_STEPS.filter((s): s is SettingsStep => s.type === 'settings');
