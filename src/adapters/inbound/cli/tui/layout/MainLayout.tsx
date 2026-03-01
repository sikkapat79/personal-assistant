import React from 'react';
import { designTokens } from '../../../../../design-tokens';
import { truncateText } from '../utils/wrapText';
import { useTuiStore } from '../store/tuiStore';
import { TopbarSection } from '../log/TopbarSection';
import { ChatSection } from '../chat/ChatSection';
import { TasksSection } from '../tasks/TasksSection';
import { InputSection } from './InputSection';
import { HelpModal } from './HelpModal';

export function MainLayout() {
  const terminalSize = useTuiStore((s) => s.terminalSize);
  const showHelp = useTuiStore((s) => s.showHelp);
  const isWideScreen = terminalSize.width >= 100;
  const availableWidth = terminalSize.width - 2;
  const chatColumnWidth = Math.floor(availableWidth * (isWideScreen ? 0.62 : 0.6));
  const rightColumnWidth = availableWidth - chatColumnWidth;
  const chatContentWidth = chatColumnWidth - 6;
  const topbarContentWidth = terminalSize.width - 6;
  const inputMaxLines = terminalSize.height < 25 ? 2 : 3;
  const maxTasksVisible = isWideScreen ? 8 : 10;

  return (
    <box style={{ flexDirection: 'column', padding: 1, overflow: 'hidden', height: '100%' }}>
      <TopbarSection contentWidth={topbarContentWidth} />
      <box style={{ flexDirection: 'row', overflow: 'hidden', flexGrow: 1 }}>
        <box style={{ flexDirection: 'column', width: chatColumnWidth, overflow: 'hidden' }}>
          <ChatSection contentWidth={chatContentWidth} maxVisibleMessages={15} />
        </box>
        <box style={{ flexDirection: 'column', width: rightColumnWidth, overflow: 'hidden' }}>
          <TasksSection contentWidth={rightColumnWidth - 6} maxVisibleItems={maxTasksVisible} />
        </box>
      </box>
      <InputSection maxLines={inputMaxLines} />
      <box>
        <text fg={designTokens.color.muted}>
          {truncateText('↑↓: scroll | Tab: switch | ?: help | Ctrl+P: settings | Ctrl+C: exit', topbarContentWidth)}
        </text>
      </box>
      {showHelp && <HelpModal />}
    </box>
  );
}
