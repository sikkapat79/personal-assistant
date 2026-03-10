import type { TodoCategory } from '../../../domain/entities/todo';
import { VALID_CATEGORIES, DEFAULT_CATEGORY } from './agent-constants';

export function parseCategory(value: unknown): TodoCategory {
  if (typeof value !== 'string') return DEFAULT_CATEGORY;
  const c = value as TodoCategory;
  return VALID_CATEGORIES.includes(c) ? c : DEFAULT_CATEGORY;
}
