import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';
import { truncateText } from '../utils/wrapText';

interface Props {
  error: string;
  terminalWidth: number;
}

export function StartupErrorScreen({ error, terminalWidth }: Props) {
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text fg={designTokens.color.error} style={{ attributes: TextAttributes.BOLD }}>
        Could not start
      </text>
      <text fg={designTokens.color.error}>{truncateText(error, terminalWidth - 4)}</text>
    </box>
  );
}
