import type { ToolDeps } from '../tool-deps';

export async function handleGetLogs(args: Record<string, unknown>, deps: ToolDeps): Promise<string> {
  const from = String(args.from ?? '');
  const to = String(args.to ?? '');
  const list = await deps.logs.findByDateRange(from, to);
  if (list.length === 0) {
    return `No log entries between ${from} and ${to}.`;
  }
  const lines = list.map(
    (l) => `- ${l.date}: ${l.content.title || 'Untitled'}${l.content.notes ? ' — ' + (l.content.notes.slice(0, 80) + (l.content.notes.length > 80 ? '…' : '')) : ''}`
  );
  return `Found ${list.length} log entr${list.length === 1 ? 'y' : 'ies'} from ${from} to ${to}:\n${lines.join('\n')}`;
}
