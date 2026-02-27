import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../design-tokens';

interface HelpModalProps {
  isWideScreen: boolean;
}

export function HelpModal({ isWideScreen }: HelpModalProps) {
  return (
    <box
      style={{
        position: 'absolute',
        top: 2,
        left: 2,
        right: 2,
        bottom: 2,
        borderStyle: 'double',
        padding: 1,
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <text style={{ attributes: TextAttributes.BOLD }}>Keyboard Shortcuts</text>
      <text> </text>
      <text>Tab - Switch focus between sections</text>
      {isWideScreen ? (
        <text fg={designTokens.color.muted}>    (Log → Tasks → Chat)</text>
      ) : (
        <text fg={designTokens.color.muted}>    (Chat ↔ Tasks)</text>
      )}
      <text>↑ ↓ - Scroll focused section</text>
      <text>Enter - Send message (when chat focused)</text>
      <text>/clear - Clear chat history</text>
      <text>? - Show this help</text>
      <text>Ctrl+C - Exit</text>
      <text> </text>
      <text fg={designTokens.color.muted}>Press any key to close...</text>
    </box>
  );
}
