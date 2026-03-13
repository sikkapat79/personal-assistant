export const STATUSES = ['Todo', 'In Progress', 'Done'] as const;
export type TaskStatus = typeof STATUSES[number];
export const STATUS_TO_INDEX: Record<TaskStatus, number> = { 'Todo': 0, 'In Progress': 1, 'Done': 2 };
