import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';

interface Props {
  minWidth: number;
  minHeight: number;
  currentWidth: number;
  currentHeight: number;
}

export function TerminalTooSmallScreen({ minWidth, minHeight, currentWidth, currentHeight }: Props) {
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text fg={designTokens.color.error} style={{ attributes: TextAttributes.BOLD }}>
        Terminal too small
      </text>
      <text fg={designTokens.color.muted}>
        Minimum: {minWidth}×{minHeight}, Current: {currentWidth}×{currentHeight}
      </text>
      <text fg={designTokens.color.muted}>Please resize your terminal.</text>
    </box>
  );
}
