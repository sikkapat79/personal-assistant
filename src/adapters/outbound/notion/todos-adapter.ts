import type {
  ITodosRepository,
  TodoUpdatePatch,
} from '../../../application/ports/ITodosRepository';
import type { Todo } from '../../../domain/entities/Todo';
import type { TodoId } from '../../../domain/value-objects/TodoId';
import type { TodoCategory, TodoPriority } from '../../../domain/entities/Todo';
import type { TodosColumns, TodosDoneKind } from './client';
import { createTodo } from '../../../domain/entities/Todo';
import { createTodoId } from '../../../domain/value-objects/TodoId';
import { getNotionClient } from './client';

/** Notion adapter for TODOs: uses database_id and full column mapping from config. Supports Done as checkbox or Status (select). */
export class NotionTodosAdapter implements ITodosRepository {
  constructor(
    private readonly client: ReturnType<typeof getNotionClient>,
    private readonly databaseId: string,
    private readonly columns: TodosColumns,
    private readonly doneKind: TodosDoneKind
  ) {}

  async listOpen(): Promise<Todo[]> {
    const c = this.columns;
    const filter =
      this.doneKind.type === 'checkbox'
        ? { property: c.done, checkbox: { equals: false } }
        : { property: c.done, select: { does_not_equal: this.doneKind.doneValue } };
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      filter,
      sorts: [{ property: c.dueDate, direction: 'ascending' }],
    });
    return res.results.map((p) => pageToTodo(p, c, this.doneKind)).filter(Boolean) as Todo[];
  }

  async listAll(): Promise<Todo[]> {
    const c = this.columns;
    const res = await this.client.databases.query({
      database_id: this.databaseId,
      sorts: [{ property: c.dueDate, direction: 'ascending' }],
    });
    return res.results.map((p) => pageToTodo(p, c, this.doneKind)).filter(Boolean) as Todo[];
  }

  async add(todo: Todo): Promise<Todo> {
    const c = this.columns;
    const doneProp =
      this.doneKind.type === 'checkbox'
        ? { checkbox: false }
        : { select: { name: this.doneKind.openValue } };
    const props: Record<string, unknown> = {
      [c.title]: { title: [{ text: { content: todo.title } }] },
      [c.done]: doneProp,
    };
    if (todo.dueDate) props[c.dueDate] = { date: { start: todo.dueDate } };
    if (todo.category != null) props[c.category] = selectProp(todo.category);
    if (todo.notes != null) props[c.notes] = richTextProp(todo.notes);
    if (todo.priority != null) props[c.priority] = selectProp(todo.priority);
    const page = await this.client.pages.create({
      parent: { database_id: this.databaseId },
      properties: props as Parameters<typeof this.client.pages.create>[0]['properties'],
    });
    return createTodo(
      todo.title,
      todo.dueDate,
      createTodoId(page.id),
      'open',
      { category: todo.category, notes: todo.notes, priority: todo.priority }
    );
  }

  async complete(id: TodoId): Promise<void> {
    const c = this.columns;
    const doneProp =
      this.doneKind.type === 'checkbox'
        ? { checkbox: true }
        : { select: { name: this.doneKind.doneValue } };
    await this.client.pages.update({
      page_id: id,
      properties: { [c.done]: doneProp },
    });
  }

  async update(id: TodoId, patch: TodoUpdatePatch): Promise<void> {
    const c = this.columns;
    const props: Record<string, unknown> = {};
    if (patch.title !== undefined) props[c.title] = { title: [{ text: { content: patch.title } }] };
    if (patch.dueDate !== undefined)
      props[c.dueDate] = patch.dueDate ? { date: { start: patch.dueDate } } : { date: null };
    if (patch.category !== undefined) props[c.category] = selectProp(patch.category);
    if (patch.notes !== undefined) props[c.notes] = richTextProp(patch.notes);
    if (patch.priority !== undefined) props[c.priority] = selectProp(patch.priority);
    if (Object.keys(props).length === 0) return;
    await this.client.pages.update({
      page_id: id,
      properties: props as Parameters<typeof this.client.pages.update>[0]['properties'],
    });
  }

  async delete(id: TodoId): Promise<void> {
    await this.client.pages.update({ page_id: id, archived: true });
  }
}

function pageToTodo(
  page: { id: string; object: string; properties?: Record<string, unknown> },
  c: TodosColumns,
  doneKind: TodosDoneKind
): Todo | null {
  if (page.object !== 'page') return null;
  const props = page.properties ?? {};
  const title = extractTitle(props[c.title]);
  const due = extractDate(props[c.dueDate]);
  const done =
    doneKind.type === 'checkbox'
      ? extractCheckbox(props[c.done])
      : extractSelect(props[c.done]) === doneKind.doneValue;
  const category = extractSelect(props[c.category]) as TodoCategory | undefined;
  const priority = extractSelect(props[c.priority]) as TodoPriority | undefined;
  const notes = extractRichText(props[c.notes]) || undefined;
  return createTodo(title, due ?? null, createTodoId(page.id), done ? 'done' : 'open', {
    category,
    notes,
    priority,
  });
}

function selectProp(value: string | undefined): { select: { name: string } | null } {
  return { select: value ? { name: value } : null };
}

function richTextProp(text: string): { rich_text: Array<{ text: { content: string } }> } {
  return { rich_text: text ? [{ text: { content: text } }] : [] };
}

function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p.title?.[0]?.plain_text ?? '';
}

function extractDate(prop: unknown): string | null {
  if (!prop || typeof prop !== 'object') return null;
  const p = prop as { date?: { start?: string } };
  return p.date?.start ?? null;
}

function extractCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== 'object') return false;
  const p = prop as { checkbox?: boolean };
  return p.checkbox ?? false;
}

function extractSelect(prop: unknown): string | undefined {
  if (!prop || typeof prop !== 'object') return undefined;
  const p = prop as { select?: { name?: string } | null };
  return p.select?.name ?? undefined;
}

function extractRichText(prop: unknown): string {
  if (!prop || typeof prop !== 'object') return '';
  const p = prop as { rich_text?: Array<{ plain_text?: string }> };
  return p.rich_text?.[0]?.plain_text ?? '';
}
