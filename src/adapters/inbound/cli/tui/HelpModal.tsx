import React from 'react';
import { designTokens } from '../../../../design-tokens';
import { Modal } from './Modal';

export function HelpModal() {
  return (
    <Modal title="Keyboard Shortcuts">
      <text>Tab - Switch focus between sections</text>
      <text fg={designTokens.color.muted}>    (Chat ↔ Tasks)</text>
      <text>↑ ↓ - Scroll focused section</text>
      <text>Enter - Send message (when chat focused)</text>
      <text>/clear - Clear chat history</text>
      <text>? - Show this help</text>
      <text>Ctrl+C - Exit</text>
      <text> </text>
      <text fg={designTokens.color.muted}>Press any key to close...</text>
    </Modal>
  );
}
