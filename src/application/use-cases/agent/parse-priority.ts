import { TODO_PRIORITIES } from '../../../domain/entities/todo';
import type { TodoPriority } from '../../../domain/entities/todo';

/** Parses priority from tool/LLM input (case-insensitive); returns canonical TodoPriority or undefined. */
export function parsePriority(value: unknown): TodoPriority | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  const match = TODO_PRIORITIES.find((p) => p.toLowerCase() === normalized.toLowerCase());
  return match ?? undefined;
}
