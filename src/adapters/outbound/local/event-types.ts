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
} from '@app/shared/event-types';

// Enums and classes must use a value export (not `export type`)
export { EntityType, EventType, EntityIdMap } from '@app/shared/event-types';
