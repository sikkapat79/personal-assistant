import { Client } from '@notionhq/client';
import { getColumnPurpose } from './notion-schema';

export { getColumnPurpose };

/** Column (property) names for the Logs database. Override via NOTION_LOGS_* env. See notion-schema.ts for purpose and types. */
export interface LogsColumns {
  title: string;
  date: string;
  score: string;
  mood: string;
  energy: string;
  deepWorkHours: string;
  workout: string;
  diet: string;
  readingMins: string;
  wentWell: string;
  improve: string;
  gratitude: string;
  tomorrow: string;
}

/** Column (property) names for the TODOs database. Override via NOTION_TODOS_* env. See notion-schema.ts for purpose and types. */
export interface TodosColumns {
  title: string;
  category: string;
  dueDate: string;
  notes: string;
  priority: string;
  done: string;
}

/** When set, the TODOs "done" column is a Status (select) instead of a checkbox. Option names for done, open, and optionally in_progress. */
export type TodosDoneKind =
  | { type: 'checkbox' }
  | { type: 'status'; doneValue: string; openValue: string; inProgressValue?: string };

/** DB metadata for both Notion databases, loaded from .env (IDs + column mapping). */
export interface NotionDbMetadata {
  logs: { databaseId: string; columns: LogsColumns };
  todos: { databaseId: string; columns: TodosColumns; doneKind: TodosDoneKind };
}

export interface NotionConfig {
  apiKey: string;
  logsDatabaseId: string;
  todosDatabaseId: string;
  /** Explicit mapping: Logs DB & TODOs DB metadata for adapters */
  db: NotionDbMetadata;
}

const DEFAULT_LOGS_COLUMNS: LogsColumns = {
  title: 'Title',
  date: 'Date',
  score: 'Score',
  mood: 'Mood',
  energy: 'Energy',
  deepWorkHours: 'Deep Work Hours',
  workout: 'Workout',
  diet: 'Diet',
  readingMins: 'Reading Mins',
  wentWell: 'Went Well',
  improve: 'Improve',
  gratitude: 'Gratitude',
  tomorrow: 'Tomorrow',
};

const DEFAULT_TODOS_COLUMNS: TodosColumns = {
  title: 'Title',
  category: 'Category',
  dueDate: 'Due Date',
  notes: 'Notes',
  priority: 'Priority',
  done: 'Done',
};

let sharedClient: Client | null = null;

export function getNotionClient(apiKey: string): Client {
  if (!sharedClient) sharedClient = new Client({ auth: apiKey });
  return sharedClient;
}

/** Flat settings shape (env or file). Used by config layer. */
export interface NotionSettingsShape {
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
}

function buildNotionConfigFrom(s: NotionSettingsShape): NotionConfig {
  const apiKey = s.NOTION_API_KEY;
  const logsDatabaseId = s.NOTION_LOGS_DATABASE_ID;
  const todosDatabaseId = s.NOTION_TODOS_DATABASE_ID;
  if (!apiKey || !logsDatabaseId || !todosDatabaseId) {
    throw new Error(
      'Missing: NOTION_API_KEY, NOTION_LOGS_DATABASE_ID, NOTION_TODOS_DATABASE_ID'
    );
  }
  const logsColumns: LogsColumns = {
    title: s.NOTION_LOGS_TITLE ?? DEFAULT_LOGS_COLUMNS.title,
    date: s.NOTION_LOGS_DATE ?? DEFAULT_LOGS_COLUMNS.date,
    score: s.NOTION_LOGS_SCORE ?? DEFAULT_LOGS_COLUMNS.score,
    mood: s.NOTION_LOGS_MOOD ?? DEFAULT_LOGS_COLUMNS.mood,
    energy: s.NOTION_LOGS_ENERGY ?? DEFAULT_LOGS_COLUMNS.energy,
    deepWorkHours: s.NOTION_LOGS_DEEP_WORK_HOURS ?? DEFAULT_LOGS_COLUMNS.deepWorkHours,
    workout: s.NOTION_LOGS_WORKOUT ?? DEFAULT_LOGS_COLUMNS.workout,
    diet: s.NOTION_LOGS_DIET ?? DEFAULT_LOGS_COLUMNS.diet,
    readingMins: s.NOTION_LOGS_READING_MINS ?? DEFAULT_LOGS_COLUMNS.readingMins,
    wentWell: s.NOTION_LOGS_WENT_WELL ?? DEFAULT_LOGS_COLUMNS.wentWell,
    improve: s.NOTION_LOGS_IMPROVE ?? DEFAULT_LOGS_COLUMNS.improve,
    gratitude: s.NOTION_LOGS_GRATITUDE ?? DEFAULT_LOGS_COLUMNS.gratitude,
    tomorrow: s.NOTION_LOGS_TOMORROW ?? DEFAULT_LOGS_COLUMNS.tomorrow,
  };
  const doneValue = s.NOTION_TODOS_DONE_VALUE;
  const useStatus = doneValue != null && doneValue !== '';
  const defaultDoneColumn = useStatus ? 'Status' : DEFAULT_TODOS_COLUMNS.done;
  const defaultOpenValue = useStatus ? 'Todo' : 'OPEN';
  const todosColumns: TodosColumns = {
    title: s.NOTION_TODOS_TITLE ?? DEFAULT_TODOS_COLUMNS.title,
    category: s.NOTION_TODOS_CATEGORY ?? DEFAULT_TODOS_COLUMNS.category,
    dueDate: s.NOTION_TODOS_DUE_DATE ?? DEFAULT_TODOS_COLUMNS.dueDate,
    notes: s.NOTION_TODOS_NOTES ?? DEFAULT_TODOS_COLUMNS.notes,
    priority: s.NOTION_TODOS_PRIORITY ?? DEFAULT_TODOS_COLUMNS.priority,
    done: s.NOTION_TODOS_STATUS ?? defaultDoneColumn,
  };
  const openValue = s.NOTION_TODOS_OPEN_VALUE ?? defaultOpenValue;
  const inProgressValue = s.NOTION_TODOS_IN_PROGRESS_VALUE;
  const doneKind: TodosDoneKind = useStatus
    ? { type: 'status', doneValue: doneValue!, openValue, inProgressValue }
    : { type: 'checkbox' };
  return {
    apiKey,
    logsDatabaseId,
    todosDatabaseId,
    db: {
      logs: { databaseId: logsDatabaseId, columns: logsColumns },
      todos: { databaseId: todosDatabaseId, columns: todosColumns, doneKind },
    },
  };
}

/** Build NotionConfig from resolved settings (config layer). */
export function buildNotionConfigFromResolved(
  settings: NotionSettingsShape
): NotionConfig {
  return buildNotionConfigFrom(settings);
}

/** Load Notion config and DB metadata from .env (NOTION_*). */
export function loadNotionConfig(): NotionConfig {
  const s: NotionSettingsShape = {
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    NOTION_LOGS_DATABASE_ID: process.env.NOTION_LOGS_DATABASE_ID,
    NOTION_TODOS_DATABASE_ID: process.env.NOTION_TODOS_DATABASE_ID,
    NOTION_LOGS_TITLE: process.env.NOTION_LOGS_TITLE,
    NOTION_LOGS_DATE: process.env.NOTION_LOGS_DATE,
    NOTION_LOGS_SCORE: process.env.NOTION_LOGS_SCORE,
    NOTION_LOGS_MOOD: process.env.NOTION_LOGS_MOOD,
    NOTION_LOGS_ENERGY: process.env.NOTION_LOGS_ENERGY,
    NOTION_LOGS_DEEP_WORK_HOURS: process.env.NOTION_LOGS_DEEP_WORK_HOURS,
    NOTION_LOGS_WORKOUT: process.env.NOTION_LOGS_WORKOUT,
    NOTION_LOGS_DIET: process.env.NOTION_LOGS_DIET,
    NOTION_LOGS_READING_MINS: process.env.NOTION_LOGS_READING_MINS,
    NOTION_LOGS_WENT_WELL: process.env.NOTION_LOGS_WENT_WELL,
    NOTION_LOGS_IMPROVE: process.env.NOTION_LOGS_IMPROVE,
    NOTION_LOGS_GRATITUDE: process.env.NOTION_LOGS_GRATITUDE,
    NOTION_LOGS_TOMORROW: process.env.NOTION_LOGS_TOMORROW,
    NOTION_TODOS_TITLE: process.env.NOTION_TODOS_TITLE,
    NOTION_TODOS_CATEGORY: process.env.NOTION_TODOS_CATEGORY,
    NOTION_TODOS_DUE_DATE: process.env.NOTION_TODOS_DUE_DATE,
    NOTION_TODOS_NOTES: process.env.NOTION_TODOS_NOTES,
    NOTION_TODOS_PRIORITY: process.env.NOTION_TODOS_PRIORITY,
    NOTION_TODOS_STATUS: process.env.NOTION_TODOS_STATUS,
    NOTION_TODOS_DONE_VALUE: process.env.NOTION_TODOS_DONE_VALUE,
    NOTION_TODOS_OPEN_VALUE: process.env.NOTION_TODOS_OPEN_VALUE,
    NOTION_TODOS_IN_PROGRESS_VALUE: process.env.NOTION_TODOS_IN_PROGRESS_VALUE,
  };
  return buildNotionConfigFrom(s);
}

/** Fetches a database and returns its property (column) names. */
export async function fetchDatabasePropertyNames(
  apiKey: string,
  databaseId: string
): Promise<string[]> {
  const client = getNotionClient(apiKey);
  const db = await client.databases.retrieve({ database_id: databaseId });
  return 'properties' in db ? Object.keys(db.properties) : [];
}

/** If the given property in the TODOs DB is a select/status type, return openValue, doneValue, and optionally inProgressValue (first = open, last = done, middle = in_progress when 3 options). */
export async function fetchTodosDoneOptions(
  client: ReturnType<typeof getNotionClient>,
  databaseId: string,
  doneColumnName: string
): Promise<{ doneValue: string; openValue: string; inProgressValue?: string } | null> {
  const db = await client.databases.retrieve({ database_id: databaseId });
  const props = 'properties' in db ? (db as { properties: Record<string, unknown> }).properties : undefined;
  if (!props || !(doneColumnName in props)) return null;
  const prop = props[doneColumnName] as { type?: string; select?: { options?: Array<{ name?: string }> }; status?: { options?: Array<{ name?: string }> } };
  const options = prop?.select?.options ?? prop?.status?.options;
  if (!Array.isArray(options) || options.length < 2) return null;
  const names = options.map((o) => (o?.name ?? '')).filter(Boolean);
  if (names.length < 2) return null;
  const openValue = names[0]!;
  const doneValue = names[names.length - 1]!;
  const inProgressValue = names.length === 3 ? names[1] : undefined;
  return { openValue, doneValue, inProgressValue };
}

export interface ColumnMappingEntry {
  entity: 'logs' | 'todos';
  ourKey: string;
  settingsKey: keyof NotionSettingsShape;
  defaultName: string;
}

const LOGS_COLUMN_ENTRIES: ColumnMappingEntry[] = [
  { entity: 'logs', ourKey: 'title', settingsKey: 'NOTION_LOGS_TITLE', defaultName: DEFAULT_LOGS_COLUMNS.title },
  { entity: 'logs', ourKey: 'date', settingsKey: 'NOTION_LOGS_DATE', defaultName: DEFAULT_LOGS_COLUMNS.date },
  { entity: 'logs', ourKey: 'score', settingsKey: 'NOTION_LOGS_SCORE', defaultName: DEFAULT_LOGS_COLUMNS.score },
  { entity: 'logs', ourKey: 'mood', settingsKey: 'NOTION_LOGS_MOOD', defaultName: DEFAULT_LOGS_COLUMNS.mood },
  { entity: 'logs', ourKey: 'energy', settingsKey: 'NOTION_LOGS_ENERGY', defaultName: DEFAULT_LOGS_COLUMNS.energy },
  { entity: 'logs', ourKey: 'deepWorkHours', settingsKey: 'NOTION_LOGS_DEEP_WORK_HOURS', defaultName: DEFAULT_LOGS_COLUMNS.deepWorkHours },
  { entity: 'logs', ourKey: 'workout', settingsKey: 'NOTION_LOGS_WORKOUT', defaultName: DEFAULT_LOGS_COLUMNS.workout },
  { entity: 'logs', ourKey: 'diet', settingsKey: 'NOTION_LOGS_DIET', defaultName: DEFAULT_LOGS_COLUMNS.diet },
  { entity: 'logs', ourKey: 'readingMins', settingsKey: 'NOTION_LOGS_READING_MINS', defaultName: DEFAULT_LOGS_COLUMNS.readingMins },
  { entity: 'logs', ourKey: 'wentWell', settingsKey: 'NOTION_LOGS_WENT_WELL', defaultName: DEFAULT_LOGS_COLUMNS.wentWell },
  { entity: 'logs', ourKey: 'improve', settingsKey: 'NOTION_LOGS_IMPROVE', defaultName: DEFAULT_LOGS_COLUMNS.improve },
  { entity: 'logs', ourKey: 'gratitude', settingsKey: 'NOTION_LOGS_GRATITUDE', defaultName: DEFAULT_LOGS_COLUMNS.gratitude },
  { entity: 'logs', ourKey: 'tomorrow', settingsKey: 'NOTION_LOGS_TOMORROW', defaultName: DEFAULT_LOGS_COLUMNS.tomorrow },
];

const TODOS_COLUMN_ENTRIES: ColumnMappingEntry[] = [
  { entity: 'todos', ourKey: 'title', settingsKey: 'NOTION_TODOS_TITLE', defaultName: DEFAULT_TODOS_COLUMNS.title },
  { entity: 'todos', ourKey: 'category', settingsKey: 'NOTION_TODOS_CATEGORY', defaultName: DEFAULT_TODOS_COLUMNS.category },
  { entity: 'todos', ourKey: 'dueDate', settingsKey: 'NOTION_TODOS_DUE_DATE', defaultName: DEFAULT_TODOS_COLUMNS.dueDate },
  { entity: 'todos', ourKey: 'notes', settingsKey: 'NOTION_TODOS_NOTES', defaultName: DEFAULT_TODOS_COLUMNS.notes },
  { entity: 'todos', ourKey: 'priority', settingsKey: 'NOTION_TODOS_PRIORITY', defaultName: DEFAULT_TODOS_COLUMNS.priority },
  { entity: 'todos', ourKey: 'done', settingsKey: 'NOTION_TODOS_STATUS', defaultName: DEFAULT_TODOS_COLUMNS.done },
];

const ALL_COLUMN_ENTRIES: ColumnMappingEntry[] = [...LOGS_COLUMN_ENTRIES, ...TODOS_COLUMN_ENTRIES];

function findBestMatch(defaultName: string, actualNames: string[]): string {
  const exact = actualNames.find((n) => n === defaultName);
  if (exact) return exact;
  const lower = defaultName.toLowerCase();
  const ci = actualNames.find((n) => n.toLowerCase() === lower);
  if (ci) return ci;
  return defaultName;
}

/** Given property names from both DBs, suggest Notion property name for each column mapping entry. */
export function suggestColumnMapping(
  logsPropertyNames: string[],
  todosPropertyNames: string[]
): Array<ColumnMappingEntry & { suggested: string }> {
  return ALL_COLUMN_ENTRIES.map((entry) => ({
    ...entry,
    suggested:
      entry.entity === 'logs'
        ? findBestMatch(entry.defaultName, logsPropertyNames)
        : findBestMatch(entry.defaultName, todosPropertyNames),
  }));
}

/** Fetches both DBs from Notion and verifies configured column names exist. Throws if mapping is invalid. */
export async function validateNotionMapping(config: NotionConfig, client: Client): Promise<void> {
  const logsDb = await client.databases.retrieve({ database_id: config.db.logs.databaseId });
  const todosDb = await client.databases.retrieve({ database_id: config.db.todos.databaseId });
  const logsProps = 'properties' in logsDb ? Object.keys(logsDb.properties) : [];
  const todosProps = 'properties' in todosDb ? Object.keys(todosDb.properties) : [];

  const logsCols = config.db.logs.columns;
  const requiredLogs = [
    logsCols.title,
    logsCols.date,
    logsCols.score,
    logsCols.mood,
    logsCols.energy,
    logsCols.deepWorkHours,
    logsCols.workout,
    logsCols.diet,
    logsCols.readingMins,
    logsCols.wentWell,
    logsCols.improve,
    logsCols.gratitude,
    logsCols.tomorrow,
  ];
  const missingLogs = requiredLogs.filter((c) => !logsProps.includes(c));
  if (missingLogs.length > 0) {
    throw new Error(
      `Logs DB missing mapped columns: ${missingLogs.join(', ')}. Available: ${logsProps.join(', ')}. Set NOTION_LOGS_* env to match your DB.`
    );
  }

  const todosCols = config.db.todos.columns;
  const requiredTodos = [
    todosCols.title,
    todosCols.category,
    todosCols.dueDate,
    todosCols.notes,
    todosCols.priority,
    todosCols.done,
  ];
  const missingTodos = requiredTodos.filter((c) => !todosProps.includes(c));
  if (missingTodos.length > 0) {
    throw new Error(
      `TODOs DB missing mapped columns: ${missingTodos.join(', ')}. Available: ${todosProps.join(', ')}. Set NOTION_TODOS_* env to match your DB.`
    );
  }
}
