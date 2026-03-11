import type { TodoCategory } from '@domain/todo/todo';
import { VALID_CATEGORIES } from './agent-constants';

export function parseCategory(value: unknown): TodoCategory | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return VALID_CATEGORIES.find((c) => c.toLowerCase() === normalized.toLowerCase());
}
