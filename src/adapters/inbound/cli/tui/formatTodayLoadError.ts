import { normalizeError } from './normalizeError';

/** Format today-log load error; add hint when it's a Notion property type or name mismatch. */
export function formatTodayLoadError(e: unknown): string {
  const msg = normalizeError(e);
  if (/could not find property|property with name or id/i.test(msg)) {
    return msg + ' — For Status (Todo/In Progress/Done): add NOTION_TODOS_DONE_VALUE=Done in Profile & Settings or ~/.pa/settings.json. NOTION_TODOS_STATUS defaults to "Status".';
  }
  if (/property type in the database does not match.*filter provided/i.test(msg) && /select does not match filter checkbox/i.test(msg)) {
    return msg + ' — Your TODOs "Done" column is a Status (select) in Notion. The app usually auto-detects this; if it failed, set NOTION_TODOS_DONE_VALUE and NOTION_TODOS_OPEN_VALUE in Profile & Settings or ~/.pa/settings.json (see .env.example).';
  }
  return msg;
}
