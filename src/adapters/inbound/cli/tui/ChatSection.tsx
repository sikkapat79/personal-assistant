import React from 'react';
import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../design-tokens';
import { truncateText, wrapText } from './wrapText';
import { AGENT_NAME } from '../../../../config/branding';

interface ChatSectionProps {
  history: { role: 'user' | 'assistant'; content: string }[];
  thinking: boolean;
  spinThinking: string;
  focused: boolean;
  contentWidth: number;
  scrollOffset: number;
  maxVisibleMessages?: number;
}

export function ChatSection({
  history,
  thinking,
  spinThinking,
  focused,
  contentWidth,
  scrollOffset,
  maxVisibleMessages = 15
}: ChatSectionProps) {
  // Convert all messages to wrapped lines
  const allLines: Array<{ role: 'user' | 'assistant'; text: string; lineIndex: number; msgIndex: number }> = [];

  for (let msgIndex = 0; msgIndex < history.length; msgIndex++) {
    const msg = history[msgIndex];
    const rolePrefix = msg.role === 'user' ? 'You: ' : `${AGENT_NAME}: `;
    const indent = '     '; // 5 spaces for continuation lines
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
  const hasMore = totalLines > scrollOffset + maxVisibleMessages;
  const hasAbove = scrollOffset > 0;

  // Show lines in view window
  const visibleLines = allLines.slice(scrollOffset, scrollOffset + maxVisibleMessages);

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
        {visibleLines.map((line, idx) => (
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
