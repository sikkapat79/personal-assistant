import type { ILogsRepository } from '../../../application/ports/logs-repository';
import type { DailyLog } from '../../../domain/entities/daily-log';
import type { LogDate } from '../../../domain/value-objects/log-date';
import type { LogsColumns } from './client';
import { createDailyLog } from '../../../domain/entities/daily-log';
import { createLogContent } from '../../../domain/value-objects/log-content';
import { getNotionClient } from './client';

/** Notion adapter for logs: uses database_id and full column mapping from config. */
export class NotionLogsAdapter implements ILogsRepository {
  constructor(
    private readonly client: ReturnType<typeof getNotionClient>,
    private readonly databaseId: string,
    private readonly columns: LogsColumns
  ) {}

  async findByDate(date: LogDate): Promise<DailyLog | null> {
    const c = this.columns;
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: { property: c.date, date: { equals: date } },
      page_size: 1,
    });
    const page = res.results[0];
    if (!page || page.object !== 'page') return null;
    const props = 'properties' in page ? page.properties : {};
    const content = pageToLogContent(props, c);
    const dateVal = extractDateStart(props[c.date]);
    if (!dateVal) return null;
    return createDailyLog(dateVal, content, page.id);
  }

  async findByDateRange(from: LogDate, to: LogDate): Promise<DailyLog[]> {
    const c = this.columns;
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        and: [
          { property: c.date, date: { on_or_after: from } },
          { property: c.date, date: { on_or_before: to } },
        ],
      },
      sorts: [{ property: c.date, direction: 'ascending' }],
    });
    const out: DailyLog[] = [];
    for (const page of res.results) {
      if (page.object !== 'page') continue;
      const props = 'properties' in page ? page.properties : {};
      const dateVal = extractDateStart(props[c.date]);
      if (!dateVal) continue;
      out.push(createDailyLog(dateVal, pageToLogContent(props, c), page.id));
    }
    return out;
  }

  async save(log: DailyLog): Promise<void> {
    const c = this.columns;
    const content = log.content;
    const existing = await this.findByDate(log.date);
    const props: Record<string, unknown> = {
      [c.date]: { date: { start: log.date } },
      [c.title]: titleProp(content.title),
      [c.score]: numberProp(content.score),
      [c.mood]: numberProp(content.mood),
      [c.energy]: numberProp(content.energy),
      [c.deepWorkHours]: numberProp(content.deepWorkHours),
      [c.workout]: checkboxProp(content.workout),
      [c.diet]: checkboxProp(content.diet),
      [c.readingMins]: numberProp(content.readingMins),
      [c.wentWell]: richTextProp(content.wentWell ?? content.notes ?? ''),
      [c.improve]: richTextProp(content.improve ?? ''),
      [c.gratitude]: richTextProp(content.gratitude ?? ''),
      [c.tomorrow]: richTextProp(content.tomorrow ?? ''),
    };
    const client = this.client;
    const databaseId = this.databaseId;
    if (existing?.id) {
      await client.pages.update({
        page_id: existing.id,
        properties: props as Parameters<typeof client.pages.update>[0]['properties'],
      });
      return;
    }
    await client.pages.create({
      parent: { database_id: databaseId },
      properties: props as Parameters<typeof client.pages.create>[0]['properties'],
    });
  }
}

function pageToLogContent(
  props: Record<string, unknown>,
  c: LogsColumns
): ReturnType<typeof createLogContent> {
  const title = extractTitle(props[c.title]);
  const wentWell = extractRichText(props[c.wentWell]);
  return createLogContent(title, wentWell, {
    score: extractNumber(props[c.score]),
    mood: extractNumber(props[c.mood]),
    energy: extractNumber(props[c.energy]),
    deepWorkHours: extractNumber(props[c.deepWorkHours]),
    workout: extractCheckbox(props[c.workout]),
    diet: extractCheckbox(props[c.diet]),
    readingMins: extractNumber(props[c.readingMins]),
    wentWell: wentWell || undefined,
    improve: extractRichText(props[c.improve]) || undefined,
    gratitude: extractRichText(props[c.gratitude]) || undefined,
    tomorrow: extractRichText(props[c.tomorrow]) || undefined,
  });
}

function titleProp(title: string): { title: Array<{ text: { content: string } }> } {
  return { title: [{ text: { content: title || 'Untitled' } }] };
}

function richTextProp(text: string): { rich_text: Array<{ text: { content: string } }> } {
  return { rich_text: text ? [{ text: { content: text } }] : [] };
}

function numberProp(n: number | undefined): { number: number | null } {
  return { number: n != null ? n : null };
}

function checkboxProp(b: boolean | undefined): { checkbox: boolean } {
  return { checkbox: b ?? false };
}

function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p.title?.[0]?.plain_text ?? '';
}

function extractRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as { rich_text?: Array<{ plain_text?: string }> };
  return p.rich_text?.[0]?.plain_text ?? '';
}

function extractNumber(prop: unknown): number | undefined {
  if (!prop || typeof prop !== 'object') return undefined;
  const p = prop as { number?: number | null };
  return p.number != null ? p.number : undefined;
}

function extractCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== 'object') return false;
  const p = prop as { checkbox?: boolean };
  return p.checkbox ?? false;
}

function extractDateStart(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null;
  const p = prop as { date?: { start?: string } };
  const start = p.date?.start;
  return start ? start.slice(0, 10) : null;
}
