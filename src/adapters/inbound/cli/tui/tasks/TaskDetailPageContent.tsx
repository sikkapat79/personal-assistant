import React from 'react';
import { TextAttributes } from '@opentui/core';
import dayjs from 'dayjs';
import { designTokens } from '../../../../../design-tokens';
import { wrapText } from '../utils/wrapText';
import type { TodoItemDto } from '../../../../../application/dto/todo-dto';

function formatDueDate(dueDate: string): string {
  const d = dayjs(dueDate);
  if (!d.isValid()) return dueDate;
  // Show time only when the original string includes a 'T' (datetime, not date-only)
  return dueDate.includes('T') ? d.format('YYYY-MM-DD HH:mm') : d.format('YYYY-MM-DD');
}

export function TaskDetailPageContent({ task, terminalWidth }: { task: TodoItemDto | null; terminalWidth: number }) {
  if (!task) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={designTokens.color.muted}>No task selected.</text>
      </box>
    );
  }

  const labelWidth = 10; // "Priority: " etc.
  const valueWidth = Math.max(20, terminalWidth - labelWidth - 4);
  const notesLines = task.notes ? wrapText(task.notes, valueWidth) : [];

  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      {/* Header row */}
      <box style={{ flexDirection: 'row' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>Task Detail</text>
        <text fg={designTokens.color.muted}>{'  —  Escape to go back'}</text>
      </box>

      <box style={{ flexDirection: 'column', marginTop: 1 }}>
        {/* Title */}
        {wrapText(task.title, valueWidth).map((line, i) => (
          <box key={`title-${i}`} style={{ flexDirection: 'row' }}>
            <text fg={designTokens.color.muted}>{i === 0 ? 'Title:    ' : '          '}</text>
            <text style={{ attributes: i === 0 ? TextAttributes.BOLD : 0 }}>{line}</text>
          </box>
        ))}

        {/* Status */}
        <box style={{ flexDirection: 'row' }}>
          <text fg={designTokens.color.muted}>{'Status:   '}</text>
          <text fg={task.status === 'In Progress' ? designTokens.color.accent : undefined}>
            {task.status === 'In Progress' ? '▶ In Progress' : task.status === 'Done' ? '✓ Done' : '○ Todo'}
          </text>
        </box>

        {/* Priority */}
        <box style={{ flexDirection: 'row' }}>
          <text fg={designTokens.color.muted}>{'Priority: '}</text>
          <text>{task.priority ?? '—'}</text>
        </box>

        {/* Category */}
        <box style={{ flexDirection: 'row' }}>
          <text fg={designTokens.color.muted}>{'Category: '}</text>
          <text>{task.category ?? '—'}</text>
        </box>

        {/* Due date */}
        <box style={{ flexDirection: 'row' }}>
          <text fg={designTokens.color.muted}>{'Due:      '}</text>
          <text>{task.dueDate ? formatDueDate(task.dueDate) : '—'}</text>
        </box>

        {/* Notes */}
        {notesLines.length > 0 && notesLines.map((line, i) => (
          <box key={`notes-${i}`} style={{ flexDirection: 'row' }}>
            <text fg={designTokens.color.muted}>{i === 0 ? 'Notes:    ' : '          '}</text>
            <text>{line}</text>
          </box>
        ))}
        {notesLines.length === 0 && (
          <box style={{ flexDirection: 'row' }}>
            <text fg={designTokens.color.muted}>{'Notes:    '}</text>
            <text fg={designTokens.color.muted}>{'—'}</text>
          </box>
        )}
      </box>
    </box>
  );
}
