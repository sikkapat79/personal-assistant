import type { TodoStatus } from '@domain/todo/todo';
import { VALID_STATUSES } from './agent-constants';

export function parseStatus(value: unknown): TodoStatus | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return VALID_STATUSES.find((x) => x.toLowerCase() === s.toLowerCase());
}
