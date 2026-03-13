import React from 'react';
import { designTokens } from '../../../../../design-tokens';

const STATUS_OPTIONS = ['Todo', 'In Progress', 'Done'] as const;
const STATUS_ICONS = ['○', '▶', '✓'] as const;

interface StatusPickerDropdownProps {
  selectedIndex: number;
  currentStatusIndex: number;
  top: number;
  left: number;
}

export function StatusPickerDropdown({ selectedIndex, currentStatusIndex, top, left }: StatusPickerDropdownProps) {
  return (
    <box
      style={{
        position: 'absolute',
        top,
        left,
        width: 20,
        flexDirection: 'column',
        borderStyle: 'single',
        backgroundColor: '#111111',
      }}
    >
      {STATUS_OPTIONS.map((status, i) => {
        const isCurrent = i === currentStatusIndex;
        const isSelected = i === selectedIndex;
        const fg = isCurrent ? designTokens.color.muted : isSelected ? designTokens.color.accent : undefined;
        const cursor = isCurrent ? '●' : isSelected ? '>' : ' ';
        return (
          <text key={status} fg={fg}>
            {`${cursor} ${STATUS_ICONS[i]} ${status}`}
          </text>
        );
      })}
    </box>
  );
}
