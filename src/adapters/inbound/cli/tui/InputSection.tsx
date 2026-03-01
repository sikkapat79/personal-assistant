import React from 'react';

interface InputSectionProps {
  input: string;
  maxLines?: number;
}

export function InputSection({ input, maxLines = 3 }: InputSectionProps) {
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
