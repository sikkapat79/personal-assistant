import type { KeyEvent } from '@opentui/core';
import { useTuiStore } from '../../store/tuiStore';
import {
  insertAt,
  deleteBeforePos,
  deleteAtPos,
  wordLeft,
  wordRight,
  lineStart,
  lineEnd,
  printableInput,
  cursorUp,
  cursorDown,
  getCursorLineCol,
} from '../../utils/textInput';

export interface ChatKeyContext {
  submit: () => Promise<void>;
  getMaxChatScroll: () => number;
}

export function handleChatKey(key: KeyEvent, ctx: ChatKeyContext): void {
  const store = useTuiStore.getState();

  // Up — move cursor up in multi-line input, else scroll chat
  if (key.name === 'up') {
    const { input, cursorPos } = store;
    const lines = input.split('\n');
    const { line: cursorLine } = getCursorLineCol(input, cursorPos);
    if (lines.length > 1 && cursorLine > 0) {
      store.setCursorPos(cursorUp(input, cursorPos));
    } else {
      store.setChatScrollOffset(offset => Math.max(0, offset - 1));
    }
    return;
  }

  // Down — move cursor down in multi-line input, else scroll chat
  if (key.name === 'down') {
    const { input, cursorPos } = store;
    const lines = input.split('\n');
    const { line: cursorLine } = getCursorLineCol(input, cursorPos);
    if (lines.length > 1 && cursorLine < lines.length - 1) {
      store.setCursorPos(cursorDown(input, cursorPos));
    } else {
      store.setChatScrollOffset(offset => Math.min(ctx.getMaxChatScroll(), offset + 1));
    }
    return;
  }

  const { input, cursorPos } = store;

  // Newline: Ctrl+J (linefeed), Option+Enter (meta+return), or Shift+Enter (Kitty terminals)
  if (
    key.name === 'linefeed' ||
    (key.name === 'return' && key.meta) ||
    (key.name === 'return' && key.shift)
  ) {
    const result = insertAt(input, cursorPos, '\n');
    store.setInput(result.text);
    store.setCursorPos(result.pos);
    return;
  }

  // Submit (plain Enter)
  if (key.name === 'return') {
    store.setCursorPos(0);
    void ctx.submit().catch(err => console.error('Failed to submit chat input:', err));
    return;
  }

  // Backspace — delete char before cursor
  if (key.name === 'backspace') {
    const result = deleteBeforePos(input, cursorPos);
    store.setInput(result.text);
    store.setCursorPos(result.pos);
    return;
  }

  // Delete — delete char at cursor
  if (key.name === 'delete') {
    const result = deleteAtPos(input, cursorPos);
    store.setInput(result.text);
    store.setCursorPos(result.pos);
    return;
  }

  // Left arrow — move cursor left (word jump with ctrl/meta)
  if (key.name === 'left') {
    store.setCursorPos(key.ctrl || key.meta ? wordLeft(input, cursorPos) : Math.max(0, cursorPos - 1));
    return;
  }

  // Right arrow — move cursor right (word jump with ctrl/meta)
  if (key.name === 'right') {
    store.setCursorPos(key.ctrl || key.meta ? wordRight(input, cursorPos) : Math.min(input.length, cursorPos + 1));
    return;
  }

  // Home / Ctrl+A — jump to start of current line
  if (key.name === 'home' || (key.ctrl && key.name === 'a')) {
    store.setCursorPos(lineStart(input, cursorPos));
    return;
  }

  // End / Ctrl+E — jump to end of current line
  if (key.name === 'end' || (key.ctrl && key.name === 'e')) {
    store.setCursorPos(lineEnd(input, cursorPos));
    return;
  }

  // Printable character — insert at cursor
  const ch = printableInput(key);
  if (ch) {
    const result = insertAt(input, cursorPos, ch);
    store.setInput(result.text);
    store.setCursorPos(result.pos);
  }
}
