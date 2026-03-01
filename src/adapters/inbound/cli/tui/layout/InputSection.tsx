import React from 'react';
import { useTuiStore } from '../store/tuiStore';

interface InputSectionProps {
  maxLines?: number;
}

export function InputSection({ maxLines = 3 }: InputSectionProps) {
  const input = useTuiStore((s) => s.input);

  // Show full input without truncation (wraps if needed)
  const displayText = input.length > 0 ? `> ${input}▌` : '> ▌';

  return (
    <box style={{
      flexDirection: 'column',
      borderStyle: 'single',
      paddingLeft: 1,
      paddingRight: 1,
      height: maxLines + 2, // +2 for borders (top + bottom)
      overflow: 'hidden'
    }}>
      <text>{displayText}</text>
    </box>
  );
}
