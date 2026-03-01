/** Shared layout metrics for TUI. Used by MainLayout, useChat, and useDataFetching. */
export function getTuiLayoutMetrics(terminalSize: { width: number; height: number }) {
  const isWideScreen = terminalSize.width >= 100;
  const availableWidth = terminalSize.width - 2;
  const chatColumnWidth = Math.floor(availableWidth * (isWideScreen ? 0.62 : 0.6));
  const rightColumnWidth = availableWidth - chatColumnWidth;
  const chatContentWidth = chatColumnWidth - 6;
  const topbarContentWidth = terminalSize.width - 6;
  const inputMaxLines = terminalSize.height < 25 ? 2 : 3;
  const maxTasksVisible = isWideScreen ? 10 : 8;

  return {
    isWideScreen,
    availableWidth,
    chatColumnWidth,
    rightColumnWidth,
    chatContentWidth,
    topbarContentWidth,
    inputMaxLines,
    maxTasksVisible,
  };
}
