import type { TodoCategory, TodoPriority, TodoStatus } from '../../domain/entities/Todo';

export interface TodoItemDto {
  id: string;
  title: string;
  dueDate: string | null;
  status: TodoStatus;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
}

export interface TodoAddInputDto {
  title: string;
  dueDate?: string | null;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
  /** Default Todo. Use In Progress when the user says to start working on it. */
  status?: TodoStatus;
}
