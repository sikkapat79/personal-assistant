import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TextAttributes } from '@opentui/core';
import { useKeyboard, useRenderer } from '@opentui/react';
import { designTokens } from '../../../../design-tokens';
import { getResolvedConfig, hasRequiredConfig } from '../../../../config/resolved';
import { useAgentMock } from './useAgentMock';
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
 * Pax TUI (Mock Version) - Uses sanitized fixture data
 * Identical to App.tsx but uses useAgentMock instead of useAgent
 */
export function AppMock() {
  const renderer = useRenderer();
  const resolved = getResolvedConfig();
  const { agent, logs, todos, error } = useAgentMock();

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
  useEffect(() => {
    if (!logs) return;
    logs
      .findByDate(todayLogDate())
      .then((log) => {
        setTodayLog(log);
        setLoadingLog(false);
      })
      .catch((e) => {
        console.error('Failed to load log:', e);
        setLoadingLog(false);
      });
  }, [logs]);

  // Fetch tasks
  useEffect(() => {
    if (!todos) return;
    todos
      .listOpen()
      .then((data) => {
        setTasks(data);
        setLoadingTasks(false);
      })
      .catch((e) => {
        console.error('Failed to load tasks:', e);
        setLoadingTasks(false);
      });
  }, [todos]);

  // Handle terminal resize
  useEffect(() => {
    const handleResize = () => {
      setTerminalSize({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // Keyboard navigation
  useKeyboard((key) => {
    // Help modal toggle
    if (key.sequence === '?' || (key.name === '/' && key.shift)) {
      setShowHelp(!showHelp);
      return;
    }

    // Close help modal with any key
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Tab: cycle focus
    if (key.name === 'tab') {
      setFocusedSection((prev) => {
        if (prev === 'log') return 'tasks';
        if (prev === 'tasks') return 'chat';
        return 'log';
      });
      return;
    }

    // Arrow keys: scroll
    if (key.name === 'up') {
      if (focusedSection === 'log') setLogScrollOffset((p) => Math.max(0, p - 1));
      if (focusedSection === 'tasks') setTasksScrollOffset((p) => Math.max(0, p - 1));
      if (focusedSection === 'chat') setChatScrollOffset((p) => Math.max(0, p - 1));
      return;
    }
    if (key.name === 'down') {
      if (focusedSection === 'log') setLogScrollOffset((p) => Math.min(getMaxLogScroll(), p + 1));
      if (focusedSection === 'tasks')
        setTasksScrollOffset((p) => Math.min(getMaxTasksScroll(), p + 1));
      if (focusedSection === 'chat') setChatScrollOffset((p) => Math.min(getMaxChatScroll(), p + 1));
      return;
    }
  });

  const handleSubmit = useCallback(
    async (line: string) => {
      if (!agent) return;

      // Check for slash commands
      if (line === '/clear') {
        setHistory([]);
        return;
      }

      // Normal chat flow
      const userMsg = { role: 'user' as const, content: line };
      setHistory((prev) => [...prev, userMsg]);
      setThinking(true);

      try {
        const response = await agent.chat(line, history);
        setHistory((prev) => [...prev, { role: 'assistant', content: response }]);

        // Refresh data after agent response (in case it made changes)
        if (logs) {
          const log = await logs.findByDate(todayLogDate());
          setTodayLog(log);
        }
        if (todos) {
          const data = await todos.listOpen();
          setTasks(data);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        setHistory((prev) => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
      } finally {
        setThinking(false);
      }
    },
    [agent, logs, todos, history]
  );

  // Error state
  if (error) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text style={{ attributes: TextAttributes.BOLD }} fg={designTokens.color.error}>
          Error: {error}
        </text>
        <text fg={designTokens.color.muted}>Check configuration and try again.</text>
      </box>
    );
  }

  // Loading state
  if (!agent || !logs || !todos) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={designTokens.color.muted}>Loading mock data...</text>
      </box>
    );
  }

  // Main UI
  const isWideScreen = terminalSize.width >= 100;
  const availableWidth = terminalSize.width - 2;

  return (
    <box style={{ flexDirection: 'column', height: terminalSize.height, width: terminalSize.width }}>
      {/* Topbar */}
      <TopbarSection todayLog={todayLog} terminalWidth={terminalSize.width} />

      {/* Main Content Area */}
      {isWideScreen ? (
        <box style={{ flexDirection: 'row', flexGrow: 1, overflow: 'hidden' }}>
          {/* Left column: Today Log + Tasks */}
          <box style={{ flexDirection: 'column', width: Math.floor(availableWidth * 0.38), overflow: 'hidden' }}>
            <TodayLogSection
              todayLog={todayLog}
              loading={loadingLog}
              focused={focusedSection === 'log'}
              contentWidth={Math.floor(availableWidth * 0.38) - 6}
              scrollOffset={logScrollOffset}
              maxVisibleLines={4}
            />
            <TasksSection
              tasks={tasks}
              loading={loadingTasks}
              focused={focusedSection === 'tasks'}
              contentWidth={Math.floor(availableWidth * 0.38) - 6}
              scrollOffset={tasksScrollOffset}
              maxVisibleItems={8}
            />
          </box>

          {/* Right column: Chat */}
          <box style={{ flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
            <ChatSection
              history={history}
              focused={focusedSection === 'chat'}
              contentWidth={Math.floor(availableWidth * 0.62) - 6}
              scrollOffset={chatScrollOffset}
              maxVisibleLines={15}
            />
            <InputSection
              input={input}
              thinking={thinking}
              spinThinking={spinThinking}
              onChange={setInput}
              onSubmit={handleSubmit}
              contentWidth={Math.floor(availableWidth * 0.62) - 6}
            />
          </box>
        </box>
      ) : (
        /* Small screen: vertical layout */
        <box style={{ flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
          <TodayLogSection
            todayLog={todayLog}
            loading={loadingLog}
            focused={focusedSection === 'log'}
            contentWidth={availableWidth - 6}
            scrollOffset={logScrollOffset}
            maxVisibleLines={3}
          />
          <TasksSection
            tasks={tasks}
            loading={loadingTasks}
            focused={focusedSection === 'tasks'}
            contentWidth={availableWidth - 6}
            scrollOffset={tasksScrollOffset}
            maxVisibleItems={10}
          />
          <ChatSection
            history={history}
            focused={focusedSection === 'chat'}
            contentWidth={availableWidth - 6}
            scrollOffset={chatScrollOffset}
            maxVisibleLines={10}
          />
          <InputSection
            input={input}
            thinking={thinking}
            spinThinking={spinThinking}
            onChange={setInput}
            onSubmit={handleSubmit}
            contentWidth={availableWidth - 6}
          />
        </box>
      )}

      {/* Help Modal Overlay */}
      {showHelp && <HelpModal isWideScreen={isWideScreen} />}
    </box>
  );
}
