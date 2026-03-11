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
  /** Optional: only written/read when truthy. */
  sleepNotes?: string;
  /** Optional: only written/read when truthy. */
  sleepMins?: string;
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

/** Scope for allowed Notion DBs and optional parent pages; used to build NotionConfig from metadata. */
export interface AllowedNotionScope {
  logsDatabaseId: string;
  todosDatabaseId: string;
  allowedPageParentIds?: string[];
  extraDatabaseIds?: string[];
  logsPurpose?: string;
  todosPurpose?: string;
  logsColumns?: LogsColumns;
  todosColumns?: TodosColumns;
  todosDoneKind?: TodosDoneKind;
}
