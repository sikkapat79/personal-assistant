// All event types now live in the application port layer.
// This file re-exports them for backward compatibility with local adapter imports.
export type {
  EventPayload,
  StoredEvent,
  TodoCreatedPayload,
  TodoUpdatedPayload,
  TodoCompletedPayload,
  TodoDeletedPayload,
  DailyLogUpsertedPayload,
} from '../../../application/ports/event-types';

// Enums and classes must use a value export (not `export type`)
export { EntityType, EventType, EntityIdMap } from '../../../application/ports/event-types';
