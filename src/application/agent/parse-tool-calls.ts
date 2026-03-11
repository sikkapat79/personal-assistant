import type { ToolCall } from './tool-call';

/** Parse human-readable TOOL_CALLS: [{"name":"...","args":{...}}] or TOOL_CALLS: {"name":"...","args":{...}}. Only when reply starts with TOOL_CALL(S): (same as RAW_TOOL_CALL_PATTERN). */
export function parseToolCalls(reply: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const trimmed = reply.trim();
  const prefix = /^TOOL_CALLS?:\s*/i;
  const match = trimmed.match(prefix);
  if (!match?.[0]) return calls;
  const afterPrefix = trimmed.slice(match[0].length);
  const jsonStart = afterPrefix.search(/[\[{]/);
  if (jsonStart < 0) return calls;
  const open = afterPrefix[jsonStart] as '[' | '{';
  const close = open === '[' ? ']' : '}';
  let depth = 1;
  let end = jsonStart + 1;
  let inString = false;
  let isEscaped = false;
  let quoteChar = '';
  for (; end < afterPrefix.length && depth > 0; end++) {
    const c = afterPrefix[end];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (c === '\\' && inString) {
      isEscaped = true;
      continue;
    }
    if ((c === '"' || c === "'") && !inString) {
      inString = true;
      quoteChar = c;
      continue;
    }
    if (c === quoteChar && inString) {
      inString = false;
      continue;
    }
    if (inString) continue;
    if (c === open) depth++;
    else if (c === close) depth--;
  }
  if (depth !== 0) return calls;
  const jsonStr = afterPrefix.slice(jsonStart, end);
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown> | Record<string, unknown>[];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of arr) {
      if (item && typeof item === 'object' && 'name' in item) {
        const rawArgs = (item as Record<string, unknown>).args;
        const args =
          rawArgs !== null && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
            ? (rawArgs as Record<string, unknown>)
            : {};
        calls.push({ name: String((item as Record<string, unknown>).name), args });
      }
    }
  } catch {
    // ignore
  }
  return calls;
}
