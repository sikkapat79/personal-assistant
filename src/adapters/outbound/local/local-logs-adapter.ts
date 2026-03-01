import type { ILogsRepository } from '../../../application/ports/logs-repository';
import type { IEventQueue } from '../../../application/ports/event-queue';
import type { DailyLog } from '../../../domain/entities/daily-log';
import type { LogDate } from '../../../domain/value-objects/log-date';
import type { StoredEvent, DailyLogUpsertedPayload } from './event-types';
import { EntityType, EventType } from './event-types';
import { LocalAdapterBase } from './local-adapter-base';
import { LocalProjection } from './local-projection';
import { SyncEngine } from './sync-engine';
import { createDailyLog } from '../../../domain/entities/daily-log';
import { createLogContent } from '../../../domain/value-objects/log-content';

export class LocalLogsAdapter extends LocalAdapterBase implements ILogsRepository {
  constructor(
    queue: IEventQueue,
    projection: LocalProjection,
    sync: SyncEngine,
    deviceId: string
  ) {
    super(queue, projection, sync, EntityType.DailyLog, deviceId);
    this.registerHandlers(projection);
  }

  private registerHandlers(projection: LocalProjection): void {
    projection.register(EventType.DailyLogUpserted, (event) => applyDailyLogUpserted(projection, event));
  }

  async findByDate(date: LogDate): Promise<DailyLog | null> {
    return this.projection.logs.get(date) ?? null;
  }

  async findByDateRange(from: LogDate, to: LogDate): Promise<DailyLog[]> {
    return Array.from(this.projection.logs.values()).filter(
      (log) => log.date >= from && log.date <= to
    );
  }

  async save(log: DailyLog): Promise<void> {
    const content = log.content;
    const payload: DailyLogUpsertedPayload = {
      title: content.title,
      notes: content.notes,
      score: content.score,
      mood: content.mood,
      energy: content.energy,
      deepWorkHours: content.deepWorkHours,
      workout: content.workout,
      diet: content.diet,
      readingMins: content.readingMins,
      wentWell: content.wentWell,
      improve: content.improve,
      gratitude: content.gratitude,
      tomorrow: content.tomorrow,
    };
    // entity_id for daily logs is the date string — stable identity in Notion
    this.write(log.date, EventType.DailyLogUpserted, payload);
  }
}

function applyDailyLogUpserted(projection: LocalProjection, event: StoredEvent): void {
  const payload = event.payload as DailyLogUpsertedPayload;
  const content = createLogContent(payload.title, payload.notes ?? '', {
    score: payload.score,
    mood: payload.mood,
    energy: payload.energy,
    deepWorkHours: payload.deepWorkHours,
    workout: payload.workout,
    diet: payload.diet,
    readingMins: payload.readingMins,
    wentWell: payload.wentWell,
    improve: payload.improve,
    gratitude: payload.gratitude,
    tomorrow: payload.tomorrow,
  });
  // entity_id for daily logs is the date string
  const existing = projection.logs.get(event.entity_id);
  const log = createDailyLog(event.entity_id, content, existing?.id);
  projection.logs.set(event.entity_id, log);
}
