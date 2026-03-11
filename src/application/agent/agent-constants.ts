import type { TodoCategory, TodoStatus } from '@domain/todo/todo';

export const RAW_TOOL_CALL_PATTERN = /^\s*TOOL_CALLS?:\s*[\s\S]*/i;
export const MAX_TOOL_ROUNDS = 5;
export const MAX_RECENT_MESSAGES = 10;
export const RETENTION_MESSAGES = 40;
export const VALID_CATEGORIES: TodoCategory[] = ['Work', 'Health', 'Personal', 'Learning'];
export const DEFAULT_CATEGORY: TodoCategory = 'Personal';
export const VALID_STATUSES: TodoStatus[] = ['Todo', 'In Progress', 'Done'];
