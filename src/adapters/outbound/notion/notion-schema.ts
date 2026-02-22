/**
 * Notion column schema: purpose and types for Logs and TODOs databases.
 * Every field is meaningful; the agent and app use partial updates (merge with existing) so other fields are preserved.
 *
 * --- TODOs ---
 * | Column     | Notion type | Purpose                                      |
 * |------------|------------|----------------------------------------------|
 * | Title      | Text (title)| Task title                                   |
 * | Category   | Select     | Work | Health | Personal | Learning           |
 * | Due Date   | Date       | When the task is due                          |
 * | Notes      | Text       | Free-form notes                               |
 * | Priority   | Select     | High | Medium | Low                  |
 * | Done       | Checkbox or Status (select) | Completion flag; Status is auto-detected if used |
 *
 * --- Logs ---
 * | Column         | Notion type | Purpose                                      |
 * |----------------|------------|----------------------------------------------|
 * | Title          | Text (title)| Log title                                    |
 * | Date           | Date       | Log date                                     |
 * | Score          | Number     | User rates the day                            |
 * | Mood           | Number     | 1–5 (emoji-based)                             |
 * | Energy         | Number     | 1–10 = energy budget for that day; yesterday’s overview is one input |
 * | Deep Work Hours| Number     | Hours in deep work                            |
 * | Workout        | Checkbox   | Did user workout?                             |
 * | Diet           | Checkbox   | Diet checkbox (user describes when to check)  |
 * | Reading Mins   | Number     | Minutes spent reading                         |
 * | Went Well      | Text       | [B] User paragraphs → app/agent translates   |
 * | Improve        | Text       | [B] User paragraphs → app/agent translates   |
 * | Gratitude      | Text       | [B] User paragraphs → app/agent translates   |
 * | Tomorrow       | Text       | [C] TODOs for next day from energy/priority/due |
 *
 * [B] = User provides paragraphs; app/agent translates or formats for Notion.
 * [C] = TODOs to finish next day, derived from today's energy, priority, and due date.
 */

export const NOTION_SCHEMA_PURPOSE = {
  todos: {
    title: 'Task title',
    category: 'Work | Health | Personal | Learning',
    dueDate: 'When the task is due',
    notes: 'Free-form notes',
    priority: 'High | Medium | Low',
    done: 'Completion flag',
  },
  logs: {
    title: 'Log title',
    date: 'Log date',
    score: 'User rates the day',
    mood: '1–5 emoji-based',
    energy: '1–10 energy budget for day; yesterday overview is one input',
    deepWorkHours: 'Hours in deep work',
    workout: 'Did user workout?',
    diet: 'Diet checkbox',
    readingMins: 'Minutes spent reading',
    wentWell: '[B] User paragraphs → translate',
    improve: '[B] User paragraphs → translate',
    gratitude: '[B] User paragraphs → translate',
    tomorrow: '[C] TODOs for next day from energy/priority/due',
  },
} as const;

type LogsPurposeKey = keyof (typeof NOTION_SCHEMA_PURPOSE)['logs'];
type TodosPurposeKey = keyof (typeof NOTION_SCHEMA_PURPOSE)['todos'];

/** Type-safe lookup for column purpose by entity and ourKey. Used by TUI setup and can guide agent/docs. */
export function getColumnPurpose(
  entity: 'logs' | 'todos',
  ourKey: string
): string {
  const map = NOTION_SCHEMA_PURPOSE[entity];
  if (entity === 'logs' && ourKey in NOTION_SCHEMA_PURPOSE.logs) {
    return NOTION_SCHEMA_PURPOSE.logs[ourKey as LogsPurposeKey];
  }
  if (entity === 'todos' && ourKey in NOTION_SCHEMA_PURPOSE.todos) {
    return NOTION_SCHEMA_PURPOSE.todos[ourKey as TodosPurposeKey];
  }
  return '';
}
