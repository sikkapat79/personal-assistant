import type { TodoStatus } from '@domain/todo/todo';
import { VALID_STATUSES } from './agent-constants';

export function parseStatus(value: unknown): TodoStatus {
  if (typeof value !== 'string') return 'Todo';
  const s = value.trim();
  const match = VALID_STATUSES.find((x) => x.toLowerCase() === s.toLowerCase());
  return match ?? 'Todo';
}
