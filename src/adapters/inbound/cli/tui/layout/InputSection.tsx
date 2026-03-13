import React, { useEffect } from 'react';
import { useTuiStore } from '../store/tuiStore';
import { getCursorLineCol } from '../utils/textInput';
import { designTokens } from '../../../../../design-tokens';

interface InputSectionProps {
  inputExpandCap: number;
  baseLines: number;
}

export function InputSection({ inputExpandCap, baseLines }: InputSectionProps) {
  const input = useTuiStore((s) => s.input);
  const cursorPos = useTuiStore((s) => s.cursorPos);
  const inputScrollOffset = useTuiStore((s) => s.inputScrollOffset);
  const setInputScrollOffset = useTuiStore((s) => s.setInputScrollOffset);
  const setInputDisplayLines = useTuiStore((s) => s.setInputDisplayLines);

  const lines = input.split('\n');
  const { line: cursorLine, col: cursorCol } = getCursorLineCol(input, cursorPos);

  const displayedLines = Math.max(baseLines, Math.min(lines.length, inputExpandCap));
  const boxHeight = displayedLines + 2; // +2 for borders

  // Sync display line count to store so MainLayout can adjust chat height
  useEffect(() => {
    setInputDisplayLines(displayedLines);
  }, [displayedLines, setInputDisplayLines]);

  // Keep cursor line visible
  useEffect(() => {
    setInputScrollOffset((offset) => {
      if (cursorLine < offset) return cursorLine;
      if (cursorLine >= offset + displayedLines) return cursorLine - displayedLines + 1;
      return offset;
    });
  }, [cursorLine, displayedLines, setInputScrollOffset]);

  const hasAbove = inputScrollOffset > 0;
  const hasBelow = inputScrollOffset + displayedLines < lines.length;
  const visibleLines = lines.slice(inputScrollOffset, inputScrollOffset + displayedLines);

  return (
    <box style={{
      flexDirection: 'column',
      borderStyle: 'single',
      paddingLeft: 1,
      paddingRight: 1,
      height: boxHeight,
      overflow: 'hidden',
    }}>
      {visibleLines.map((line, i) => {
        const absIdx = i + inputScrollOffset;
        let prefix: string;
        if (absIdx === 0) {
          prefix = hasAbove ? '↑ ' : '> ';
        } else if (i === displayedLines - 1 && hasBelow) {
          prefix = '↓ ';
        } else {
          prefix = '  ';
        }

        if (absIdx === cursorLine) {
          const before = line.slice(0, cursorCol);
          const atCursor = line[cursorCol] ?? ' ';
          const after = line.slice(cursorCol + 1);
          return (
            <text key={absIdx}>
              {prefix}{before}<span style={{ bg: designTokens.color.accent, fg: '#000000' }}>{atCursor}</span>{after}
            </text>
          );
        }
        return <text key={absIdx}>{prefix}{line}</text>;
      })}
    </box>
  );
}
