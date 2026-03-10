import type { TodoCategory, TodoPriority, TodoStatus } from '@domain/todo/todo';

export interface TodoUpdatePatch {
  title?: string;
  dueDate?: string | null;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
  status?: TodoStatus;
}
