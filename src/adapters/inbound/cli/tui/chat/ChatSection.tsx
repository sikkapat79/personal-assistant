import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';
import { truncateText, wrapText } from '../utils/wrapText';
import { AGENT_NAME } from '../../../../../config/branding';
import { useTuiStore } from '../store/tuiStore';

interface ChatSectionProps {
  contentWidth: number;
  maxVisibleMessages?: number;
}

export function ChatSection({
  contentWidth,
  maxVisibleMessages = 15
}: ChatSectionProps) {
  const history = useTuiStore((s) => s.history);
  const thinking = useTuiStore((s) => s.thinking);
  const spinThinking = useTuiStore((s) => s.spinThinking);
  const chatScrollOffset = useTuiStore((s) => s.chatScrollOffset);
  const focusedSection = useTuiStore((s) => s.focusedSection);
  const focused = focusedSection === 'chat';

  // Convert all messages to wrapped lines
  const allLines: Array<{ role: 'user' | 'assistant'; text: string; lineIndex: number; msgIndex: number }> = [];

  for (let msgIndex = 0; msgIndex < history.length; msgIndex++) {
    const msg = history[msgIndex];
    const rolePrefix = msg.role === 'user' ? 'You: ' : `${AGENT_NAME}: `;
    const indent = ' '.repeat(rolePrefix.length);
    const wrappedLines = wrapText(msg.content, contentWidth - rolePrefix.length);

    for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex++) {
      const lineText = lineIndex === 0
        ? rolePrefix + wrappedLines[lineIndex]
        : indent + wrappedLines[lineIndex];

      allLines.push({
        role: msg.role,
        text: truncateText(lineText, contentWidth), // Ensure no overflow
        lineIndex,
        msgIndex
      });
    }
  }

  const totalLines = allLines.length;
  const hasMore = totalLines > chatScrollOffset + maxVisibleMessages;
  const hasAbove = chatScrollOffset > 0;

  // Show lines in view window
  const visibleLines = allLines.slice(chatScrollOffset, chatScrollOffset + maxVisibleMessages);

  return (
    <box style={{ flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
      <text style={{ attributes: TextAttributes.BOLD }}>
        {focused ? '● ' : ''}Chat with {AGENT_NAME}{hasAbove ? ' ↑' : ''}{hasMore ? ' ↓' : ''}
      </text>
      <box style={{ flexDirection: 'column', marginTop: 1, flexGrow: 1 }}>
        {history.length === 0 && !thinking && (
          <text fg={designTokens.color.muted}>
            {truncateText('Type a message and press Enter...', contentWidth)}
          </text>
        )}
        {visibleLines.map((line) => (
          <text
            key={`${line.msgIndex}-${line.lineIndex}`}
            fg={line.role === 'assistant' ? designTokens.color.muted : undefined}
          >
            {line.text}
          </text>
        ))}
        {thinking && (
          <text fg={designTokens.color.thinking}>
            {truncateText(`${spinThinking} Thinking...`, contentWidth)}
          </text>
        )}
      </box>
    </box>
  );
}
