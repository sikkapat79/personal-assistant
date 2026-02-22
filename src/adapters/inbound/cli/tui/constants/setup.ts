import { AGENT_NAME } from '../../../../../config/branding';
import type { Settings } from '../../../../../config/settings';

/** Ask for the "brain" (OpenAI agent) first, then Notion data sources. */
export const SETUP_STEPS: { key: keyof Settings; label: string }[] = [
  { key: 'OPENAI_API_KEY', label: `OpenAI API key (optional, for ${AGENT_NAME})` },
  { key: 'OPENAI_MODEL', label: 'OpenAI model (optional, e.g. gpt-4o-mini)' },
  { key: 'NOTION_API_KEY', label: 'Notion API key (from notion.so/my-integrations)' },
  { key: 'NOTION_LOGS_DATABASE_ID', label: 'Notion Logs database ID (from the database URL)' },
  { key: 'NOTION_TODOS_DATABASE_ID', label: 'Notion TODOs database ID (from the database URL)' },
];
