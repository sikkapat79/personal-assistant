import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TextAttributes } from '@opentui/core';
import { useKeyboard, useRenderer } from '@opentui/react';
import { designTokens } from '../../../../design-tokens';
import { getResolvedConfig, hasRequiredConfig } from '../../../../config/resolved';
import { useAgent } from './useAgent';
import { useSpinner } from './useSpinner';
import { truncateText, calculateChatLineCount } from './wrapText';
import { clearConsole } from './clearConsole';
import { todayLogDate, createLogDate } from '../../../../domain/value-objects/log-date';
import type { DailyLog } from '../../../../domain/entities/daily-log';
import type { TodoItemDto } from '../../../../application/dto/todo-dto';
import { TodayLogSection } from './TodayLogSection';
import { TasksSection } from './TasksSection';
import { ChatSection } from './ChatSection';
import { InputSection } from './InputSection';
import { TopbarSection } from './TopbarSection';
import { HelpModal } from './HelpModal';

/**
 * Pax TUI - Clean implementation with proper overflow handling
 */
export function App() {
  const renderer = useRenderer();
  const resolved = getResolvedConfig();
  const { agent, logs, todos, error } = useAgent();

  // Terminal dimensions
  const [terminalSize, setTerminalSize] = useState({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  });

  // App state
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);
  const [tasks, setTasks] = useState<TodoItemDto[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [focusedSection, setFocusedSection] = useState<'log' | 'tasks' | 'chat'>('chat');
  const [logScrollOffset, setLogScrollOffset] = useState(0);
  const [tasksScrollOffset, setTasksScrollOffset] = useState(0);
  const [chatScrollOffset, setChatScrollOffset] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const spinThinking = useSpinner(thinking);

  // Calculate max scroll offsets to prevent over-scrolling
  const getMaxLogScroll = useCallback(() => {
    if (!todayLog) return 0;
    let lineCount = 1; // title
    if (todayLog.content.mood !== undefined || todayLog.content.energy !== undefined) lineCount++; // metrics
    if (todayLog.content.notes) lineCount++;
    if (
      todayLog.content.workout !== undefined ||
      todayLog.content.diet !== undefined ||
      todayLog.content.deepWorkHours !== undefined
    )
      lineCount++;
    if (todayLog.content.gratitude) lineCount++;
    return Math.max(0, lineCount - 4); // 4 is maxVisibleLines in 2-column mode
  }, [todayLog]);

  const getMaxTasksScroll = useCallback(() => {
    const isWideScreen = terminalSize.width >= 100;
    const maxVisible = isWideScreen ? 8 : 10; // 8 for wide, 10 for small
    return Math.max(0, tasks.length - maxVisible);
  }, [tasks, terminalSize.width]);

  const getMaxChatScroll = useCallback(() => {
    const maxVisible = 15; // Default max visible lines
    // Estimate content width based on terminal size
    const isWideScreen = terminalSize.width >= 100;
    const availableWidth = terminalSize.width - 2;
    const chatColumnWidth = Math.floor(availableWidth * (isWideScreen ? 0.62 : 0.6));
    const chatContentWidth = chatColumnWidth - 6;
    // Calculate total wrapped lines
    const totalLines = calculateChatLineCount(history, chatContentWidth);
    return Math.max(0, totalLines - maxVisible);
  }, [history, terminalSize.width]);

  // Fetch today's log
  const fetchTodayLog = useCallback(async () => {
    if (!logs) return;
    try {
      setLoadingLog(true);
      const today = todayLogDate();
      const log = await logs.findByDate(createLogDate(today));
      setTodayLog(log);
    } catch (e) {
      console.error('Failed to fetch today log:', e);
    } finally {
      setLoadingLog(false);
    }
  }, [logs]);

  // Fetch log on mount
  useEffect(() => {
    fetchTodayLog();
  }, [fetchTodayLog]);

  // Reset log scroll when log changes
  useEffect(() => {
    setLogScrollOffset(0);
  }, [todayLog]);

  // Fetch open tasks
  const fetchTasks = useCallback(async (showLoading = false) => {
    if (!todos) return;
    try {
      if (showLoading) setLoadingTasks(true);
      const openTasks = await todos.listOpen();
      // Filter to show only Todo and In Progress status
      const activeTasks = openTasks.filter((t) => t.status === 'Todo' || t.status === 'In Progress');
      setTasks(activeTasks);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      if (showLoading) setLoadingTasks(false);
    }
  }, [todos]);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks(true); // Show loading on initial fetch
  }, [fetchTasks]);

  // Poll tasks every 15 seconds
  useEffect(() => {
    if (!todos) return;
    const interval = setInterval(() => {
      fetchTasks(false); // Silent polling, no loading flash
    }, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [todos, fetchTasks]);

  // Reset tasks scroll when tasks change
  useEffect(() => {
    setTasksScrollOffset(0);
  }, [tasks]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    const maxScroll = getMaxChatScroll();
    setChatScrollOffset(maxScroll); // Always show latest messages
  }, [history, getMaxChatScroll]);

  // Terminal resize handling
  useEffect(() => {
    const onResize = () => {
      setTerminalSize({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  // Submit handler
  const submit = useCallback(async () => {
    const line = input.trim();
    setInput('');
    if (!line) return;

    if (line === 'exit' || line === 'quit') {
      clearConsole();
      renderer.destroy();
      process.exit(0);
      return;
    }

    // Handle /clear command - wipe chat history
    if (line === '/clear') {
      setHistory([]);
      return;
    }

    if (!agent) return;

    setThinking(true);

    try {
      const reply = await agent.chat(line, history);
      setHistory((h) => [
        ...h,
        { role: 'user', content: line },
        { role: 'assistant', content: reply },
      ]);
      // Refresh log after agent response (may have updated it)
      fetchTodayLog();
    } catch (e) {
      setHistory((h) => [
        ...h,
        { role: 'user', content: line },
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setThinking(false);
    }
  }, [input, agent, history, renderer, fetchTodayLog]);

  // Ref to track focused section (avoid stale closures)
  const focusedSectionRef = useRef(focusedSection);
  useEffect(() => {
    focusedSectionRef.current = focusedSection;
  }, [focusedSection]);

  // Keyboard handling
  useKeyboard((key) => {
    const isWideScreen = terminalSize.width >= 100;

    // Help modal - ? key toggles, any key closes when open
    if (showHelp) {
      setShowHelp(false);
      return;
    }
    // Check for ? (works with or without shift flag)
    if (key.sequence === '?' || (key.name === '/' && key.shift)) {
      setShowHelp(true);
      return;
    }

    // Tab key - cycle through sections (different for small vs wide)
    if (key.name === 'tab') {
      setFocusedSection((current) => {
        if (isWideScreen) {
          // Wide screen: Log → Tasks → Chat
          if (current === 'log') return 'tasks';
          if (current === 'tasks') return 'chat';
          return 'log';
        } else {
          // Small screen: Chat ↔ Tasks (no log)
          if (current === 'chat') return 'tasks';
          return 'chat';
        }
      });
      return;
    }

    // Handle scroll keys for log, tasks, and chat sections
    if (focusedSectionRef.current === 'log') {
      if (key.name === 'up') {
        setLogScrollOffset((offset) => Math.max(0, offset - 1));
        return;
      }
      if (key.name === 'down') {
        const maxScroll = getMaxLogScroll();
        setLogScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        return;
      }
      return; // Don't handle other keys
    }

    if (focusedSectionRef.current === 'tasks') {
      if (key.name === 'up') {
        setTasksScrollOffset((offset) => Math.max(0, offset - 1));
        return;
      }
      if (key.name === 'down') {
        const maxScroll = getMaxTasksScroll();
        setTasksScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        return;
      }
      return; // Don't handle other keys
    }

    // Chat is focused - handle both scroll and input
    if (focusedSectionRef.current === 'chat') {
      // Arrow keys scroll chat history
      if (key.name === 'up') {
        setChatScrollOffset((offset) => Math.max(0, offset - 1));
        return;
      }
      if (key.name === 'down') {
        const maxScroll = getMaxChatScroll();
        setChatScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        return;
      }
      // Fall through to handle input keys below
    } else {
      // Not chat focused, don't handle other keys
      return;
    }

    if (key.name === 'return') {
      submit();
      return;
    }

    if (key.ctrl && key.name === 'c') {
      clearConsole();
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (key.name === 'backspace' || key.name === 'delete') {
      setInput((s) => s.slice(0, -1));
      return;
    }

    // Regular character input
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setInput((s) => s + key.sequence);
    }
  });

  // Check minimum size
  const minWidth = 80;
  const minHeight = 20;

  if (terminalSize.width < minWidth || terminalSize.height < minHeight) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={designTokens.color.error} style={{ attributes: TextAttributes.BOLD }}>
          Terminal too small
        </text>
        <text fg={designTokens.color.muted}>
          Minimum: {minWidth}×{minHeight}, Current: {terminalSize.width}×{terminalSize.height}
        </text>
        <text fg={designTokens.color.muted}>Please resize your terminal.</text>
      </box>
    );
  }

  // Handle errors
  if (error) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={designTokens.color.error} style={{ attributes: TextAttributes.BOLD }}>
          Could not start
        </text>
        <text fg={designTokens.color.error}>{truncateText(error, terminalSize.width - 4)}</text>
      </box>
    );
  }

  if (!hasRequiredConfig()) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={designTokens.color.error} style={{ attributes: TextAttributes.BOLD }}>
          Configuration required
        </text>
        <text fg={designTokens.color.muted}>
          Set NOTION_API_KEY, NOTION_LOGS_DATABASE_ID, NOTION_TODOS_DATABASE_ID
        </text>
      </box>
    );
  }

  // Determine layout mode based on width
  const isWideScreen = terminalSize.width >= 100;
  const totalWidth = terminalSize.width;

  // Calculate input box height based on terminal size
  const inputMaxLines = terminalSize.height < 25 ? 2 : 3;

  // Small screen layout (< 100 width)
  if (!isWideScreen) {
    const availableWidth = totalWidth - 2; // Account for parent padding
    const chatColumnWidth = Math.floor(availableWidth * 0.6); // 60%
    const tasksColumnWidth = availableWidth - chatColumnWidth; // 40%
    const chatContentWidth = chatColumnWidth - 6;
    const tasksContentWidth = tasksColumnWidth - 6;
    const topbarContentWidth = totalWidth - 6;

    return (
      <box style={{ flexDirection: 'column', padding: 1, overflow: 'hidden', height: '100%' }}>
        {/* Topbar - Compact Metrics */}
        <TopbarSection todayLog={todayLog} loading={loadingLog} contentWidth={topbarContentWidth} />

        {/* Two Columns: Chat (60%) + Tasks (40%) - grows to fill space */}
        <box style={{ flexDirection: 'row', overflow: 'hidden', flexGrow: 1 }}>
          {/* Left Column - Chat */}
          <box style={{ flexDirection: 'column', width: chatColumnWidth, overflow: 'hidden' }}>
            <ChatSection
              history={history}
              thinking={thinking}
              spinThinking={spinThinking}
              focused={focusedSection === 'chat'}
              contentWidth={chatContentWidth}
              scrollOffset={chatScrollOffset}
            />
          </box>

          {/* Right Column - Tasks */}
          <box style={{ flexDirection: 'column', width: tasksColumnWidth, overflow: 'hidden' }}>
            <TasksSection
              tasks={tasks}
              loading={loadingTasks}
              focused={focusedSection === 'tasks'}
              contentWidth={tasksContentWidth}
              scrollOffset={tasksScrollOffset}
              maxVisibleItems={10}
            />
          </box>
        </box>

        {/* Input - Pinned at bottom */}
        <InputSection input={input} contentWidth={topbarContentWidth} maxLines={inputMaxLines} />

        {/* Footer */}
        <box>
          <text fg={designTokens.color.muted}>
            {truncateText(
              focusedSection !== 'chat'
                ? '↑↓: scroll | Tab: switch | ?: help | Ctrl+C: exit'
                : '↑↓: scroll | Tab: switch | ?: help | Ctrl+C: exit',
              topbarContentWidth
            )}
          </text>
        </box>

        {/* Help Modal */}
        {showHelp && <HelpModal isWideScreen={false} />}
      </box>
    );
  }

  // Wide screen layout (≥ 100 width) - Golden ratio
  const availableWidth = totalWidth - 2; // Account for parent padding
  const chatColumnWidth = Math.floor(availableWidth * 0.62); // 62%
  const sidebarColumnWidth = availableWidth - chatColumnWidth; // 38%
  const chatContentWidth = chatColumnWidth - 6;
  const sidebarContentWidth = sidebarColumnWidth - 6;

  return (
    <box style={{ flexDirection: 'column', padding: 1, overflow: 'hidden', height: '100%' }}>
      {/* Main content row - grows to fill space */}
      <box style={{ flexDirection: 'row', overflow: 'hidden', flexGrow: 1 }}>
        {/* Left Column - Chat */}
        <box style={{ flexDirection: 'column', width: chatColumnWidth, overflow: 'hidden' }}>
          <ChatSection
            history={history}
            thinking={thinking}
            spinThinking={spinThinking}
            focused={focusedSection === 'chat'}
            contentWidth={chatContentWidth}
            scrollOffset={chatScrollOffset}
          />
        </box>

        {/* Right Column - Sidebar (Log + Tasks) */}
        <box style={{ flexDirection: 'column', width: sidebarColumnWidth, overflow: 'hidden' }}>
          <TodayLogSection
            todayLog={todayLog}
            loading={loadingLog}
            focused={focusedSection === 'log'}
            contentWidth={sidebarContentWidth}
            scrollOffset={logScrollOffset}
            maxVisibleLines={4}
          />

          <TasksSection
            tasks={tasks}
            loading={loadingTasks}
            focused={focusedSection === 'tasks'}
            contentWidth={sidebarContentWidth}
            scrollOffset={tasksScrollOffset}
            maxVisibleItems={8}
          />
        </box>
      </box>

      {/* Input - Pinned at bottom */}
      <InputSection input={input} contentWidth={chatContentWidth} maxLines={inputMaxLines} />

      {/* Footer */}
      <box>
        <text fg={designTokens.color.muted}>
          {truncateText('↑↓: scroll | Tab: switch | ?: help | Ctrl+C: exit', chatContentWidth)}
        </text>
      </box>

      {/* Help Modal */}
      {showHelp && <HelpModal isWideScreen={true} />}
    </box>
  );
}
