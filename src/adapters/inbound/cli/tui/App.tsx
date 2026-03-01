import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useKeyboard, useRenderer, useAppContext } from '@opentui/react';
import { getResolvedConfig, hasRequiredConfig } from '../../../../config/resolved';
import { useAgent } from './hooks/useAgent';
import { useSpinner } from './hooks/useSpinner';
import { truncateText, calculateChatLineCount, wrapText } from './utils/wrapText';
import { clearConsole } from './utils/clearConsole';
import { todayLogDate, createLogDate } from '../../../../domain/value-objects/log-date';
import type { DailyLog } from '../../../../domain/entities/daily-log';
import type { TodoItemDto } from '../../../../application/dto/todo-dto';
import type { Composition } from '../../../../composition';
import { saveSettings, loadSettings } from '../../../../config/settings';
import { saveProfile } from '../../../../config/profile';
import { SETUP_STEPS, SETTINGS_STEPS } from './constants/setup';
import { SettingsPageContent } from './settings/SettingsPageContent';
import { FirstRunSetupContent } from './settings/FirstRunSetupContent';
import type { Page } from './types';
import { TuiStateContext } from './context/TuiStateContext';
import { TerminalTooSmallScreen } from './layout/TerminalTooSmallScreen';
import { StartupErrorScreen } from './layout/StartupErrorScreen';
import { MainLayout } from './layout/MainLayout';

interface AppProps {
  composeFn?: () => Promise<Composition>;
  onConfigSaved?: () => void;
}

/**
 * Pax TUI - Clean implementation with proper overflow handling
 */
export function App({ composeFn, onConfigSaved }: AppProps) {
  const renderer = useRenderer();
  const resolved = getResolvedConfig();
  const { agent, logs, todos, error } = useAgent(composeFn);

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
  const [focusedSection, setFocusedSection] = useState<'tasks' | 'chat'>('chat');
  const [tasksScrollOffset, setTasksScrollOffset] = useState(0);
  const [chatScrollOffset, setChatScrollOffset] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Page navigation
  const [page, setPage] = useState<Page>('main');
  const [displayNameInput, setDisplayNameInput] = useState(resolved.profile.displayName);
  const [savedDisplayName, setSavedDisplayName] = useState(resolved.profile.displayName);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'api-keys'>('profile');
  const [setupStep, setSetupStep] = useState(0);
  const [setupInput, setSetupInput] = useState('');
  const [apiKeysSelectedRow, setApiKeysSelectedRow] = useState(0);
  const [apiKeysEditingIndex, setApiKeysEditingIndex] = useState<number | null>(null);
  const [apiKeysEditInput, setApiKeysEditInput] = useState('');

  const spinThinking = useSpinner(thinking);

  const getMaxTasksScroll = useCallback(() => {
    const isWideScreen = terminalSize.width >= 100;
    const maxVisible = isWideScreen ? 8 : 10;
    const availableWidth = terminalSize.width - 2;
    const chatColumnWidth = Math.floor(availableWidth * (isWideScreen ? 0.62 : 0.6));
    const tasksColumnWidth = availableWidth - chatColumnWidth;
    const contentWidth = tasksColumnWidth - 6;

    let totalLines = 0;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const statusIcon = task.status === 'In Progress' ? '▶' : '○';
      const prefix = `${i + 1}. ${statusIcon} `;
      const suffix = task.priority ? ` (${task.priority})` : '';
      const wrapped = wrapText(task.title + suffix, Math.max(1, contentWidth - prefix.length));
      totalLines += wrapped.length;
    }
    return Math.max(0, totalLines - maxVisible);
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

  // Clamp tasks scroll when tasks change (preserve position during polling)
  useEffect(() => {
    setTasksScrollOffset((offset) => Math.min(offset, getMaxTasksScroll()));
  }, [tasks, getMaxTasksScroll]);

  // Auto-scroll chat to bottom when new messages arrive (only if already near bottom)
  const AUTO_SCROLL_THRESHOLD = 3;
  useEffect(() => {
    const maxScroll = getMaxChatScroll();
    setChatScrollOffset((current) =>
      current >= maxScroll - AUTO_SCROLL_THRESHOLD ? maxScroll : current
    );
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

  // Paste support (bracketed paste via @opentui/core paste event)
  const { keyHandler } = useAppContext();
  useEffect(() => {
    if (!keyHandler) return;
    const handler = (event: { text: string }) => {
      const text = event.text.replace(/[^\x20-\x7E]/g, '');
      if (!text) return;
      if (page === 'settings') {
        if (settingsTab === 'profile') setDisplayNameInput(s => s + text);
        if (settingsTab === 'api-keys' && apiKeysEditingIndex !== null) setApiKeysEditInput(s => s + text);
      } else if (!hasRequiredConfig()) {
        setSetupInput(s => s + text);
      } else {
        setInput(s => s + text);
      }
    };
    keyHandler.on('paste', handler);
    return () => { keyHandler.off('paste', handler); };
  }, [keyHandler, page, settingsTab, apiKeysEditingIndex]);

  // Keyboard handling
  useKeyboard((key) => {
    const isWideScreen = terminalSize.width >= 100;

    // Global Ctrl+C - always exits regardless of page or focus
    if (key.ctrl && key.name === 'c') {
      clearConsole();
      renderer.destroy();
      process.exit(0);
      return;
    }

    // Helper - filters key.sequence to printable ASCII chars only
    function printableInput(k: { ctrl?: boolean; meta?: boolean; sequence?: string }): string {
      if (k.ctrl || k.meta) return '';
      return (k.sequence ?? '').replace(/[^\x20-\x7E]/g, '');
    }

    // Settings page input
    if (page === 'settings') {
      // Escape cancels in-progress API key edit first; only then goes to main
      if (settingsTab === 'api-keys' && apiKeysEditingIndex !== null && key.name === 'escape') {
        setApiKeysEditingIndex(null);
        setApiKeysEditInput('');
        return;
      }
      if ((key.ctrl && key.name === 'p') || key.name === 'escape') {
        setPage('main');
        return;
      }
      if (key.name === 'tab') {
        if (settingsTab === 'profile') {
          setApiKeysSelectedRow(0); setApiKeysEditingIndex(null); setApiKeysEditInput('');
          setSettingsTab('api-keys');
        } else if (settingsTab === 'api-keys' && apiKeysEditingIndex === null) {
          const nextRow = apiKeysSelectedRow + 1;
          if (nextRow >= SETTINGS_STEPS.length) {
            setSettingsTab('profile');
          } else {
            setApiKeysSelectedRow(nextRow);
          }
        }
        return;
      }

      if (settingsTab === 'profile') {
        if (key.name === 'return') { saveProfile({ displayName: displayNameInput }); setSavedDisplayName(displayNameInput); return; }
        if (key.name === 'backspace' || key.name === 'delete') { setDisplayNameInput(s => s.slice(0, -1)); return; }
        const ch = printableInput(key);
        if (ch) setDisplayNameInput(s => s + ch);
        return;
      }

      if (settingsTab === 'api-keys') {
        if (apiKeysEditingIndex !== null) {
          if (key.name === 'return') {
            if (apiKeysEditInput.trim()) {
              const current = loadSettings();
              saveSettings({ ...current, [SETTINGS_STEPS[apiKeysEditingIndex].key]: apiKeysEditInput.trim() });
            }
            setApiKeysEditingIndex(null); setApiKeysEditInput(''); return;
          }
          if (key.name === 'escape') { setApiKeysEditingIndex(null); setApiKeysEditInput(''); return; }
          if (key.name === 'backspace' || key.name === 'delete') { setApiKeysEditInput(s => s.slice(0, -1)); return; }
          const ch = printableInput(key);
          if (ch) setApiKeysEditInput(s => s + ch);
          return;
        }
        // Not editing — navigation
        if (key.name === 'up') { setApiKeysSelectedRow(r => Math.max(0, r - 1)); return; }
        if (key.name === 'down') { setApiKeysSelectedRow(r => Math.min(SETTINGS_STEPS.length - 1, r + 1)); return; }
        if (key.name === 'return') { setApiKeysEditingIndex(apiKeysSelectedRow); setApiKeysEditInput(''); return; }
        return;
      }
    }

    // No-config wizard keyboard handling (show until user leaves confirmation)
    if (!hasRequiredConfig() || (setupStep > 0 && setupStep <= SETUP_STEPS.length)) {
      // Confirmation screen — Enter/Tab goes to main
      if (setupStep >= SETUP_STEPS.length) {
        if (key.name === 'return' || key.name === 'tab') {
          setSetupStep(0);
          setSetupInput('');
          onConfigSaved?.();
        }
        return;
      }
      // Regular step
      if (key.name === 'return' || key.name === 'tab' || key.name === 'escape') {
        if ((key.name === 'return' || key.name === 'tab') && setupInput.trim()) {
          const step = SETUP_STEPS[setupStep];
          if (step.type === 'profile') {
            saveProfile({ displayName: setupInput.trim() });
            setSavedDisplayName(setupInput.trim());
          } else {
            const current = loadSettings();
            saveSettings({ ...current, [step.key]: setupInput.trim() });
          }
        }
        setSetupStep(setupStep + 1); setSetupInput('');
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') { setSetupInput(s => s.slice(0, -1)); return; }
      const ch = printableInput(key);
      if (ch) setSetupInput(s => s + ch);
      return;
    }

    // Help modal - ? key toggles, any key closes when open
    if (showHelp) {
      setShowHelp(false);
      return;
    }
    // Check for ? (works with or without shift flag) - only when not typing
    if (input.length === 0 && (key.sequence === '?' || (key.name === '/' && key.shift))) {
      setShowHelp(true);
      return;
    }

    if (key.ctrl && key.name === 'p') {
      setDisplayNameInput(resolved.profile.displayName);
      setSavedDisplayName(resolved.profile.displayName);
      setSettingsTab('profile');
      setApiKeysSelectedRow(0); setApiKeysEditingIndex(null); setApiKeysEditInput('');
      setPage('settings');
      return;
    }

    // Tab key - cycle through sections (different for small vs wide)
    if (key.name === 'tab') {
      setFocusedSection((current) => {
        if (isWideScreen) {
          // Wide screen: Chat ↔ Tasks (log is in top bar only)
          if (current === 'chat') return 'tasks';
          return 'chat';
        } else {
          // Small screen: Chat ↔ Tasks (no log)
          if (current === 'chat') return 'tasks';
          return 'chat';
        }
      });
      return;
    }

    // Handle scroll keys for tasks and chat sections
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

    if (key.name === 'backspace' || key.name === 'delete') {
      setInput((s) => s.slice(0, -1));
      return;
    }

    // Regular character input
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setInput((s) => s + key.sequence);
    }
  });

  const contextValue = {
    terminalSize,
    focusedSection,
    showHelp,
    input,
    history,
    thinking,
    spinThinking,
    chatScrollOffset,
    tasks,
    loadingTasks,
    tasksScrollOffset,
    todayLog,
    loadingLog,
  };

  const minWidth = 80;
  const minHeight = 20;

  if (terminalSize.width < minWidth || terminalSize.height < minHeight) {
    return (
      <TerminalTooSmallScreen
        minWidth={minWidth}
        minHeight={minHeight}
        currentWidth={terminalSize.width}
        currentHeight={terminalSize.height}
      />
    );
  }

  const currentStepDef = SETUP_STEPS[setupStep];
  const currentStepValue = currentStepDef
    ? currentStepDef.type === 'profile'
      ? resolved.profile.displayName
      : (resolved.settings[currentStepDef.key] as string | undefined)
    : undefined;

  if (page === 'settings') {
    return (
      <SettingsPageContent
        displayNameInput={displayNameInput}
        savedDisplayName={savedDisplayName}
        settingsTab={settingsTab}
        apiKeysSelectedRow={apiKeysSelectedRow}
        apiKeysEditingIndex={apiKeysEditingIndex}
        apiKeysEditInput={apiKeysEditInput}
        resolved={resolved}
      />
    );
  }

  // First-run wizard before error: when config is missing, compose() throws and sets error,
  // but we must show the wizard so the user can enter credentials (not "Could not start").
  // Show until user completes all steps and leaves confirmation (setupStep reset to 0).
  if (!hasRequiredConfig() || (setupStep > 0 && setupStep <= SETUP_STEPS.length)) {
    return (
      <FirstRunSetupContent
        setupStep={setupStep}
        setupInput={setupInput}
        currentValue={currentStepValue}
        settings={setupStep >= SETUP_STEPS.length ? loadSettings() : undefined}
        displayName={setupStep >= SETUP_STEPS.length ? resolved.profile.displayName : undefined}
      />
    );
  }

  // Handle errors (only when config is present; missing-config case is handled by wizard above)
  if (error) {
    return <StartupErrorScreen error={error} terminalWidth={terminalSize.width} />;
  }

  return (
    <TuiStateContext.Provider value={contextValue}>
      <MainLayout />
    </TuiStateContext.Provider>
  );
}
