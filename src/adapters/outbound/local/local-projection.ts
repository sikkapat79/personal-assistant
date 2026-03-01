import type { DailyLog } from '../../../domain/entities/daily-log';
import type { Todo } from '../../../domain/entities/todo';
import type { StoredEvent } from './event-types';

export class LocalProjection {
  readonly todos: Map<string, Todo> = new Map();
  readonly logs: Map<string, DailyLog> = new Map();

  private readonly handlers: Map<string, (event: StoredEvent) => void> = new Map();

  register(eventType: string, handler: (event: StoredEvent) => void): void {
    this.handlers.set(eventType, handler);
  }

  apply(event: StoredEvent): void {
    this.handlers.get(event.event_type)?.(event);
  }

  applyAll(events: StoredEvent[]): void {
    for (const event of events) {
      this.apply(event);
    }
  }

  loadFromSnapshot(snapshot: { todos: Todo[]; logs: DailyLog[] }): void {
    this.todos.clear();
    this.logs.clear();
    for (const todo of snapshot.todos) {
      this.todos.set(todo.id, todo);
    }
    for (const log of snapshot.logs) {
      this.logs.set(log.date, log);
    }
  }
}
