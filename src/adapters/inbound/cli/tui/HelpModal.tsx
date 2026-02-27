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
      <text>
        <text style={{ attributes: TextAttributes.BOLD }}>Tab</text> - Switch focus between sections
      </text>
      {isWideScreen ? (
        <text fg={designTokens.color.muted}>      (Log → Tasks → Chat)</text>
      ) : (
        <text fg={designTokens.color.muted}>      (Chat ↔ Tasks)</text>
      )}
      <text>
        <text style={{ attributes: TextAttributes.BOLD }}>↑ ↓</text> - Scroll focused section
      </text>
      <text>
        <text style={{ attributes: TextAttributes.BOLD }}>Enter</text> - Send message (when chat
        focused)
      </text>
      <text>
        <text style={{ attributes: TextAttributes.BOLD }}>/clear</text> - Clear chat history
      </text>
      <text>
        <text style={{ attributes: TextAttributes.BOLD }}>?</text> - Show this help
      </text>
      <text>
        <text style={{ attributes: TextAttributes.BOLD }}>Ctrl+C</text> - Exit
      </text>
      <text> </text>
      <text fg={designTokens.color.muted}>Press any key to close...</text>
    </box>
  );
}
