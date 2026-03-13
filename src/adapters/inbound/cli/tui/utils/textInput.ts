/** Insert `ch` at position `pos`, returning new text and updated cursor position. */
export function insertAt(s: string, pos: number, ch: string): { text: string; pos: number } {
  const clamped = Math.max(0, Math.min(pos, s.length));
  return {
    text: s.slice(0, clamped) + ch + s.slice(clamped),
    pos: clamped + ch.length,
  };
}

/** Delete the character before `pos` (backspace). */
export function deleteBeforePos(s: string, pos: number): { text: string; pos: number } {
  if (pos <= 0) return { text: s, pos: 0 };
  return {
    text: s.slice(0, pos - 1) + s.slice(pos),
    pos: pos - 1,
  };
}

/** Delete the character at `pos` (delete key). */
export function deleteAtPos(s: string, pos: number): { text: string; pos: number } {
  if (pos >= s.length) return { text: s, pos };
  return {
    text: s.slice(0, pos) + s.slice(pos + 1),
    pos,
  };
}

/** Move cursor one word to the left. */
export function wordLeft(s: string, pos: number): number {
  let i = pos;
  while (i > 0 && /\s/.test(s[i - 1])) i--;
  while (i > 0 && !/\s/.test(s[i - 1])) i--;
  return i;
}

/** Move cursor one word to the right. */
export function wordRight(s: string, pos: number): number {
  let i = pos;
  while (i < s.length && !/\s/.test(s[i])) i++;
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

/** Move cursor to start of current line (before nearest preceding \n). */
export function lineStart(s: string, pos: number): number {
  const before = s.slice(0, pos);
  const lastNewline = before.lastIndexOf('\n');
  return lastNewline === -1 ? 0 : lastNewline + 1;
}

/** Move cursor to end of current line (before next \n or end of string). */
export function lineEnd(s: string, pos: number): number {
  const after = s.slice(pos);
  const nextNewline = after.indexOf('\n');
  return nextNewline === -1 ? s.length : pos + nextNewline;
}

/** Extract printable ASCII chars from a key event sequence, ignoring ctrl/meta combos. */
export function printableInput(k: { ctrl?: boolean; meta?: boolean; sequence?: string }): string {
  if (k.ctrl || k.meta) return '';
  return (k.sequence ?? '').replace(/[^\x20-\x7E]/g, '');
}

/** Returns the character offset of the start of each line. */
export function getLineStartOffsets(text: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') offsets.push(i + 1);
  }
  return offsets;
}

export function getCursorLineCol(text: string, pos: number): { line: number; col: number } {
  const before = text.slice(0, pos);
  const parts = before.split('\n');
  return { line: parts.length - 1, col: parts[parts.length - 1].length };
}

/** Move cursor up one line, preserving column (clamped to line length). */
export function cursorUp(text: string, pos: number): number {
  const { line, col } = getCursorLineCol(text, pos);
  if (line === 0) return pos;
  const offsets = getLineStartOffsets(text);
  const lines = text.split('\n');
  const targetLineLen = lines[line - 1].length;
  return offsets[line - 1] + Math.min(col, targetLineLen);
}

/** Move cursor down one line, preserving column (clamped to line length). */
export function cursorDown(text: string, pos: number): number {
  const { line, col } = getCursorLineCol(text, pos);
  const lines = text.split('\n');
  if (line >= lines.length - 1) return pos;
  const offsets = getLineStartOffsets(text);
  const targetLineLen = lines[line + 1].length;
  return offsets[line + 1] + Math.min(col, targetLineLen);
}
