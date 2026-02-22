import { Client } from '@notionhq/client';

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

/** When set, the TODOs "done" column is a Status (select) instead of a checkbox. This is the option name that means done (e.g. "DONE", "Closed"). */
export type TodosDoneKind = { type: 'checkbox' } | { type: 'status'; doneValue: string; openValue: string };

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

/** Load Notion config and DB metadata from .env (NOTION_*). */
export function loadNotionConfig(): NotionConfig {
  const apiKey = process.env.NOTION_API_KEY;
  const logsDatabaseId = process.env.NOTION_LOGS_DATABASE_ID;
  const todosDatabaseId = process.env.NOTION_TODOS_DATABASE_ID;
  if (!apiKey || !logsDatabaseId || !todosDatabaseId) {
    throw new Error(
      'Missing env: NOTION_API_KEY, NOTION_LOGS_DATABASE_ID, NOTION_TODOS_DATABASE_ID'
    );
  }
  const logsColumns: LogsColumns = {
    title: process.env.NOTION_LOGS_TITLE ?? DEFAULT_LOGS_COLUMNS.title,
    date: process.env.NOTION_LOGS_DATE ?? DEFAULT_LOGS_COLUMNS.date,
    score: process.env.NOTION_LOGS_SCORE ?? DEFAULT_LOGS_COLUMNS.score,
    mood: process.env.NOTION_LOGS_MOOD ?? DEFAULT_LOGS_COLUMNS.mood,
    energy: process.env.NOTION_LOGS_ENERGY ?? DEFAULT_LOGS_COLUMNS.energy,
    deepWorkHours: process.env.NOTION_LOGS_DEEP_WORK_HOURS ?? DEFAULT_LOGS_COLUMNS.deepWorkHours,
    workout: process.env.NOTION_LOGS_WORKOUT ?? DEFAULT_LOGS_COLUMNS.workout,
    diet: process.env.NOTION_LOGS_DIET ?? DEFAULT_LOGS_COLUMNS.diet,
    readingMins: process.env.NOTION_LOGS_READING_MINS ?? DEFAULT_LOGS_COLUMNS.readingMins,
    wentWell: process.env.NOTION_LOGS_WENT_WELL ?? DEFAULT_LOGS_COLUMNS.wentWell,
    improve: process.env.NOTION_LOGS_IMPROVE ?? DEFAULT_LOGS_COLUMNS.improve,
    gratitude: process.env.NOTION_LOGS_GRATITUDE ?? DEFAULT_LOGS_COLUMNS.gratitude,
    tomorrow: process.env.NOTION_LOGS_TOMORROW ?? DEFAULT_LOGS_COLUMNS.tomorrow,
  };
  const todosColumns: TodosColumns = {
    title: process.env.NOTION_TODOS_TITLE ?? DEFAULT_TODOS_COLUMNS.title,
    category: process.env.NOTION_TODOS_CATEGORY ?? DEFAULT_TODOS_COLUMNS.category,
    dueDate: process.env.NOTION_TODOS_DUE_DATE ?? DEFAULT_TODOS_COLUMNS.dueDate,
    notes: process.env.NOTION_TODOS_NOTES ?? DEFAULT_TODOS_COLUMNS.notes,
    priority: process.env.NOTION_TODOS_PRIORITY ?? DEFAULT_TODOS_COLUMNS.priority,
    done: process.env.NOTION_TODOS_DONE ?? DEFAULT_TODOS_COLUMNS.done,
  };
  const doneValue = process.env.NOTION_TODOS_DONE_VALUE;
  const openValue = process.env.NOTION_TODOS_OPEN_VALUE ?? 'OPEN';
  const doneKind: TodosDoneKind =
    doneValue != null && doneValue !== ''
      ? { type: 'status', doneValue, openValue }
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
