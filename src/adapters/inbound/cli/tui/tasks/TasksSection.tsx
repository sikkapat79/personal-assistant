import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';
import { truncateText, wrapText } from '../utils/wrapText';
import { useTuiStore } from '../store/tuiStore';
import { StatusPickerDropdown } from './StatusPickerDropdown';


interface TasksSectionProps {
  contentWidth: number;
  maxVisibleItems?: number;
}

const STATUS_TO_INDEX: Record<string, number> = { 'Todo': 0, 'In Progress': 1, 'Done': 2 };

export function TasksSection({
  contentWidth,
  maxVisibleItems = 5
}: TasksSectionProps) {
  const tasks = useTuiStore((s) => s.tasks);
  const loadingTasks = useTuiStore((s) => s.loadingTasks);
  const tasksScrollOffset = useTuiStore((s) => s.tasksScrollOffset);
  const focusedSection = useTuiStore((s) => s.focusedSection);
  const selectedTaskIndex = useTuiStore((s) => s.selectedTaskIndex);
  const showStatusPicker = useTuiStore((s) => s.showStatusPicker);
  const statusPickerIndex = useTuiStore((s) => s.statusPickerIndex);
  const focused = focusedSection === 'tasks';

  // Convert all tasks to wrapped lines
  const allLines: Array<{ taskId: string; text: string; color?: string; bold?: boolean; lineIndex: number; taskIndex: number }> = [];

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const task = tasks[taskIndex];
    const isSelected = focused && taskIndex === selectedTaskIndex;
    const statusIcon = task.status === 'In Progress' ? '▶' : '○';
    const cursorMark = isSelected ? '>' : ' ';
    const prefix = `${taskIndex + 1}.${cursorMark}${statusIcon} `;
    const suffix = task.priority ? ` (${task.priority})` : '';
    const taskText = task.title + suffix;
    const wrappedLines = wrapText(taskText, contentWidth - prefix.length);
    const color = isSelected ? designTokens.color.accent : task.status === 'In Progress' ? designTokens.color.accent : undefined;

    for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex++) {
      allLines.push({
        taskId: task.id,
        text:
          lineIndex === 0
            ? prefix + wrappedLines[lineIndex]
            : ' '.repeat(prefix.length) + wrappedLines[lineIndex],
        color,
        bold: isSelected,
        lineIndex,
        taskIndex
      });
    }
  }

  const totalLines = allLines.length;
  const hasMore = totalLines > tasksScrollOffset + maxVisibleItems;
  const hasAbove = tasksScrollOffset > 0;
  const visibleLines = allLines.slice(tasksScrollOffset, tasksScrollOffset + maxVisibleItems);

  // Picker anchor: visible line index of the selected task's first line
  const anchorRow = visibleLines.findIndex(
    (l) => l.taskIndex === selectedTaskIndex && l.lineIndex === 0
  );

  const selectedTask = tasks[selectedTaskIndex];
  const currentStatusIndex = selectedTask ? (STATUS_TO_INDEX[selectedTask.status] ?? 0) : 0;

  // Flip picker above the anchor row when there isn't enough space below
  const PICKER_HEIGHT = 5; // 3 rows + 2 borders
  const effectiveAnchorRow = anchorRow >= 0 ? anchorRow : 0;
  const spaceBelow = maxVisibleItems - effectiveAnchorRow;
  const pickerTop = spaceBelow >= PICKER_HEIGHT
    ? 4 + effectiveAnchorRow
    : Math.max(0, 4 + effectiveAnchorRow - PICKER_HEIGHT);

  return (
    <box style={{ flexDirection: 'column', borderStyle: 'single', padding: 1, marginBottom: 1, flexGrow: 1, overflow: 'hidden' }}>
      <text style={{ attributes: TextAttributes.BOLD }}>
        {focused ? '● ' : ''}Tasks{hasAbove ? ' ↑' : ''}{hasMore ? ' ↓' : ''}
      </text>
      {loadingTasks && (
        <text fg={designTokens.color.muted}>{truncateText('Loading...', contentWidth)}</text>
      )}
      {!loadingTasks && tasks.length === 0 && (
        <text fg={designTokens.color.muted}>{truncateText('No active tasks', contentWidth)}</text>
      )}
      {!loadingTasks && tasks.length > 0 && (
        <box style={{ flexDirection: 'column', marginTop: 1 }}>
          {visibleLines.map((line) => (
            <text
              key={`${line.taskId}-${line.lineIndex}`}
              fg={line.color}
              style={line.bold ? { attributes: TextAttributes.BOLD } : undefined}
            >
              {line.text}
            </text>
          ))}
        </box>
      )}
      {showStatusPicker && (
        <StatusPickerDropdown
          selectedIndex={statusPickerIndex}
          currentStatusIndex={currentStatusIndex}
          top={pickerTop}
          left={2}
        />
      )}
    </box>
  );
}
