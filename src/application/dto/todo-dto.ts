import type { TodoCategory, TodoPriority } from '../../domain/entities/Todo';

export interface TodoItemDto {
  id: string;
  title: string;
  dueDate: string | null;
  status: 'open' | 'done';
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
}
