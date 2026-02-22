/** Returns the character to append for keypress, or null if not a typeable character. */
export function typeableChar(key: {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}): string | null {
  if (key.ctrl || key.meta) return null;
  if (key.name === 'space') return ' ';
  if (key.name.length === 1) {
    if (key.shift && /^[a-z]$/.test(key.name)) return key.name.toUpperCase();
    return key.name;
  }
  return null;
}
