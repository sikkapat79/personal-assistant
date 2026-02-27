import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../design-tokens';
import { truncateText, wrapText } from './wrapText';
import { energyBarSegments } from './energyBarSegments';
import type { DailyLog } from '../../../../domain/entities/daily-log';

interface TodayLogSectionProps {
  todayLog: DailyLog | null;
  loading: boolean;
  focused: boolean;
  contentWidth: number;
  scrollOffset: number;
  maxVisibleLines?: number;
}

export function TodayLogSection({
  todayLog,
  loading,
  focused,
  contentWidth,
  scrollOffset,
  maxVisibleLines = 5
}: TodayLogSectionProps) {
  // Collect all log lines to enable scrolling
  const logLines: React.ReactNode[] = [];

  if (!loading && todayLog) {
    // Title
    logLines.push(
      <text key="title">
        {truncateText(`📅 ${todayLog.content.title}`, contentWidth)}
      </text>
    );

    // Metrics on separate line if present
    if (todayLog.content.mood !== undefined || todayLog.content.energy !== undefined) {
      logLines.push(
        <text key="metrics" fg={designTokens.color.muted}>
          {truncateText(
            `Mood: ${todayLog.content.mood ?? '-'}/10  Energy: ${todayLog.content.energy ?? '-'}/100`,
            contentWidth
          )}
        </text>
      );

      // Energy bar visualization
      if (todayLog.content.energy !== undefined) {
        const { filled, empty } = energyBarSegments(todayLog.content.energy);
        logLines.push(
          <text key="energy-bar" fg={designTokens.color.muted}>
            {truncateText(`${filled}${empty}`, contentWidth)}
          </text>
        );
      }
    }

    // Notes (wrapped)
    if (todayLog.content.notes) {
      const notesPrefix = '💭 ';
      const wrappedNotes = wrapText(todayLog.content.notes, contentWidth - notesPrefix.length);
      wrappedNotes.forEach((line, idx) => {
        logLines.push(
          <text key={`notes-${idx}`} fg={designTokens.color.muted}>
            {idx === 0 ? notesPrefix + line : '   ' + line}
          </text>
        );
      });
    }

    // Activities
    if (
      todayLog.content.workout !== undefined ||
      todayLog.content.diet !== undefined ||
      todayLog.content.deepWorkHours !== undefined
    ) {
      logLines.push(
        <text key="activities" fg={designTokens.color.muted}>
          {truncateText(
            `${todayLog.content.workout ? '✓ Workout' : ''}${
              todayLog.content.workout && todayLog.content.diet ? '  ' : ''
            }${todayLog.content.diet ? '✓ Diet' : ''}${
              (todayLog.content.workout || todayLog.content.diet) && todayLog.content.deepWorkHours ? '  ' : ''
            }${todayLog.content.deepWorkHours ? `🎯 ${todayLog.content.deepWorkHours}h deep work` : ''}`,
            contentWidth
          )}
        </text>
      );
    }

    // Gratitude (wrapped)
    if (todayLog.content.gratitude) {
      const gratitudePrefix = '🙏 ';
      const wrappedGratitude = wrapText(todayLog.content.gratitude, contentWidth - gratitudePrefix.length);
      wrappedGratitude.forEach((line, idx) => {
        logLines.push(
          <text key={`gratitude-${idx}`} fg={designTokens.color.muted}>
            {idx === 0 ? gratitudePrefix + line : '   ' + line}
          </text>
        );
      });
    }
  }

  const hasMore = logLines.length > scrollOffset + maxVisibleLines;
  const hasAbove = scrollOffset > 0;
  const visibleLines = logLines.slice(scrollOffset, scrollOffset + maxVisibleLines);
  return (
    <box style={{ flexDirection: 'column', borderStyle: 'single', padding: 1, marginBottom: 1 }}>
      <text style={{ attributes: TextAttributes.BOLD }}>
        {focused ? '● ' : ''}Today's Log{hasAbove ? ' ↑' : ''}{hasMore ? ' ↓' : ''}
      </text>
      {loading && (
        <text fg={designTokens.color.muted}>{truncateText('Loading...', contentWidth)}</text>
      )}
      {!loading && !todayLog && (
        <text fg={designTokens.color.muted}>{truncateText('No log for today yet', contentWidth)}</text>
      )}
      {!loading && todayLog && (
        <box style={{ flexDirection: 'column', marginTop: 1 }}>
          {visibleLines}
        </box>
      )}
    </box>
  );
}
