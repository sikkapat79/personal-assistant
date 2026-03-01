import React from 'react';
import { designTokens } from '../../../../../design-tokens';
import { truncateText } from '../utils/wrapText';
import { energyBarSegments } from './energyBarSegments';
import { useTuiStore } from '../store/tuiStore';

interface TopbarSectionProps {
  contentWidth: number;
}

export function TopbarSection({ contentWidth }: TopbarSectionProps) {
  const todayLog = useTuiStore((s) => s.todayLog);
  const loadingLog = useTuiStore((s) => s.loadingLog);

  if (loadingLog) {
    return (
      <box style={{ borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
        <text fg={designTokens.color.muted}>{truncateText('Loading...', contentWidth)}</text>
      </box>
    );
  }

  if (!todayLog) {
    return (
      <box style={{ borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
        <text fg={designTokens.color.muted}>{truncateText('No log for today', contentWidth)}</text>
      </box>
    );
  }

  // Build compact metrics string
  const parts: string[] = [];

  if (todayLog.content.mood !== undefined) {
    parts.push(`Mood: ${todayLog.content.mood}/10`);
  }

  if (todayLog.content.energy !== undefined) {
    const { filled, empty } = energyBarSegments(todayLog.content.energy);
    parts.push(`${filled}${empty} ${todayLog.content.energy}/100`);
  }

  if (todayLog.content.deepWorkHours !== undefined) {
    parts.push(`🎯 ${todayLog.content.deepWorkHours}h`);
  }

  if (todayLog.content.workout) {
    parts.push('✓ Workout');
  }

  if (todayLog.content.diet) {
    parts.push('✓ Diet');
  }

  const metricsText = parts.length > 0 ? parts.join(' | ') : 'No metrics yet';

  return (
    <box style={{ borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
      <text>{truncateText(metricsText, contentWidth)}</text>
    </box>
  );
}
