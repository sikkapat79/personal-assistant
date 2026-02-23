/**
 * Tests for createTodoDueDate and parseIsoDateOrDatetimeToYyyyMmDd.
 * Ensures YYYY-MM-DD and ISO datetime (e.g. Notion) both normalize to YYYY-MM-DD,
 * and invalid inputs still throw.
 * Run: bun run test:todo-due-date
 */
import { createTodoDueDate } from '../src/domain/value-objects/todo-due-date';
import { parseIsoDateOrDatetimeToYyyyMmDd } from '../src/domain/value-objects/parse-iso-date';

function assertEqual(actual: unknown, expected: unknown, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertThrows(fn: () => void, msg: string): void {
  try {
    fn();
    throw new Error(`${msg}: expected throw, did not throw`);
  } catch (e) {
    if (e instanceof Error && e.message.includes('expected throw')) throw e;
  }
}

// createTodoDueDate: null/empty → null
assertEqual(createTodoDueDate(null), null, 'null');
assertEqual(createTodoDueDate(undefined), null, 'undefined');
assertEqual(createTodoDueDate(''), null, 'empty string');

// createTodoDueDate: date-only and ISO datetime → same YYYY-MM-DD
assertEqual(createTodoDueDate('2024-01-15'), '2024-01-15', 'date-only');
assertEqual(createTodoDueDate('2024-01-15T12:00:00.000Z'), '2024-01-15', 'ISO datetime Z');
assertEqual(createTodoDueDate('2024-01-15T00:00:00+00:00'), '2024-01-15', 'ISO datetime +00:00');

// createTodoDueDate: invalid still throws
assertThrows(() => createTodoDueDate('01/15/2024'), 'invalid format');
assertThrows(() => createTodoDueDate('2024-13-01'), 'invalid month');

// parseIsoDateOrDatetimeToYyyyMmDd: date and datetime
assertEqual(parseIsoDateOrDatetimeToYyyyMmDd('2024-01-15'), '2024-01-15', 'parser date-only');
assertEqual(parseIsoDateOrDatetimeToYyyyMmDd('2024-01-15T12:00:00.000Z'), '2024-01-15', 'parser datetime');

// parseIsoDateOrDatetimeToYyyyMmDd: invalid throws
assertThrows(() => parseIsoDateOrDatetimeToYyyyMmDd('01/15/2024'), 'parser invalid format');
assertThrows(() => parseIsoDateOrDatetimeToYyyyMmDd('2024-13-01'), 'parser invalid month');

console.log('todo-due-date: all tests passed');
