import type { IEventQueue } from '../../../application/ports/event-queue';
import type { EntityType, EventPayload, EventType, StoredEvent } from './event-types';
import type { LocalProjection } from './local-projection';
import type { SyncEngine } from './sync-engine';

export abstract class LocalAdapterBase {
  constructor(
    protected readonly queue: IEventQueue,
    protected readonly projection: LocalProjection,
    protected readonly sync: SyncEngine,
    protected readonly entityType: EntityType,
    protected readonly deviceId: string
  ) {}

  protected write(entityId: string, eventType: EventType, payload: EventPayload): StoredEvent {
    const event: StoredEvent = {
      id: Bun.randomUUIDv7(),
      entity_type: this.entityType,
      entity_id: entityId,
      event_type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      device_id: this.deviceId,
      synced: 0,
    };
    this.queue.append(event);
    this.projection.apply(event);
    this.sync.nudge();
    return event;
  }
}
