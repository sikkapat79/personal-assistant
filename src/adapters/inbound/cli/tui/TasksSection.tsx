import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../design-tokens';
import { truncateText, wrapText } from './wrapText';
import type { TodoItemDto } from '../../../../application/dto/todo-dto';

interface TasksSectionProps {
  tasks: TodoItemDto[];
  loading: boolean;
  focused: boolean;
  contentWidth: number;
  scrollOffset: number;
  maxVisibleItems?: number;
}

export function TasksSection({
  tasks,
  loading,
  focused,
  contentWidth,
  scrollOffset,
  maxVisibleItems = 5
}: TasksSectionProps) {
  // Convert all tasks to wrapped lines
  const allLines: Array<{ taskId: string; text: string; color?: string; lineIndex: number; taskIndex: number }> = [];

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const task = tasks[taskIndex];
    const statusIcon = task.status === 'In Progress' ? '▶' : '○';
    const prefix = `${taskIndex + 1}. ${statusIcon} `;
    const suffix = task.priority ? ` (${task.priority})` : '';
    const taskText = task.title + suffix;
    const wrappedLines = wrapText(taskText, contentWidth - prefix.length);
    const color = task.status === 'In Progress' ? designTokens.color.accent : undefined;

    for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex++) {
      allLines.push({
        taskId: task.id,
        text: lineIndex === 0 ? prefix + wrappedLines[lineIndex] : '     ' + wrappedLines[lineIndex], // 5 spaces indent
        color,
        lineIndex,
        taskIndex
      });
    }
  }

  const totalLines = allLines.length;
  const hasMore = totalLines > scrollOffset + maxVisibleItems;
  const hasAbove = scrollOffset > 0;
  const visibleLines = allLines.slice(scrollOffset, scrollOffset + maxVisibleItems);

  return (
    <box style={{ flexDirection: 'column', borderStyle: 'single', padding: 1, marginBottom: 1, flexGrow: 1, overflow: 'hidden' }}>
      <text style={{ attributes: TextAttributes.BOLD }}>
        {focused ? '● ' : ''}Tasks{hasAbove ? ' ↑' : ''}{hasMore ? ' ↓' : ''}
      </text>
      {loading && (
        <text fg={designTokens.color.muted}>{truncateText('Loading...', contentWidth)}</text>
      )}
      {!loading && tasks.length === 0 && (
        <text fg={designTokens.color.muted}>{truncateText('No active tasks', contentWidth)}</text>
      )}
      {!loading && tasks.length > 0 && (
        <box style={{ flexDirection: 'column', marginTop: 1 }}>
          {visibleLines.map((line, idx) => (
            <text key={`${line.taskId}-${line.lineIndex}`} fg={line.color}>
              {line.text}
            </text>
          ))}
        </box>
      )}
    </box>
  );
}
