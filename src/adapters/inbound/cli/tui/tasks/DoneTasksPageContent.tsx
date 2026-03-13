import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';
import { truncateText } from '../utils/wrapText';
import { useTuiStore } from '../store/tuiStore';

export function DoneTasksPageContent({ terminalWidth }: { terminalWidth: number }) {
  const doneTasks = useTuiStore((s) => s.doneTasks);
  const contentWidth = Math.max(20, terminalWidth - 4);

  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <box style={{ flexDirection: 'row' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>Done Today</text>
        <text fg={designTokens.color.muted}>{'  —  Escape or Ctrl+D to go back'}</text>
      </box>

      <box style={{ flexDirection: 'column', marginTop: 1 }}>
        {doneTasks.length === 0 && (
          <text fg={designTokens.color.muted}>No tasks completed today.</text>
        )}
        {doneTasks.map((task, i) => (
          <box key={task.id} style={{ flexDirection: 'row' }}>
            <text fg={designTokens.color.muted}>{`${i + 1}. `}</text>
            <text>{`✓ ${truncateText(task.title, contentWidth - 5)}`}</text>
          </box>
        ))}
      </box>
    </box>
  );
}
