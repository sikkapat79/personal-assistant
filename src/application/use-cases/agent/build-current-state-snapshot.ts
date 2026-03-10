import type { DailyLog } from '../../../domain/entities/daily-log';
import type { Todo } from '../../../domain/entities/todo';

export function buildCurrentStateSnapshot(todayDate: string, todayLog: DailyLog | null, openTodos: Todo[]): string {
  const lines: string[] = [];
  if (todayLog === null) {
    lines.push(`Today's log: none yet. (User has not created a log for ${todayDate}.)`);
  } else {
    const c = todayLog.content;
    const parts = ["Today's log: exists."];
    if (c.title) parts.push(`Title: "${c.title}"`);
    if (c.mood != null) parts.push(`mood ${c.mood}/5`);
    if (c.energy != null) parts.push(`energy ${c.energy}/100`);
    if (c.score != null) parts.push(`score ${c.score}/10`);
    lines.push(parts.join('. '));
  }
  if (openTodos.length === 0) {
    lines.push('Open tasks: none.');
  } else {
    const preview = openTodos.slice(0, 5).map((t, i) => `${i + 1}. ${t.title}`).join('; ');
    lines.push(`Open tasks: ${openTodos.length} (${preview}${openTodos.length > 5 ? '…' : ''}).`);
  }
  return lines.join('\n');
}
