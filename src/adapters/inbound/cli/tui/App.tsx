import React, { useState, useEffect, useRef } from 'react';
import { useRenderer, useAppContext } from '@opentui/react';
import { getResolvedConfig, hasRequiredConfig } from '../../../../config/resolved';
import { useAgent } from './hooks/useAgent';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useChat } from './hooks/useChat';
import { useDataFetching } from './hooks/useDataFetching';
import { useAppKeyboard } from './hooks/useAppKeyboard';
import { loadSettings } from '../../../../config/settings';
import { SETUP_STEPS } from './constants/setup';
import { SettingsPageContent } from './settings/SettingsPageContent';
import { FirstRunSetupContent } from './settings/FirstRunSetupContent';
import type { Page } from './types';
import { TerminalTooSmallScreen } from './layout/TerminalTooSmallScreen';
import { StartupErrorScreen } from './layout/StartupErrorScreen';
import { MainLayout } from './layout/MainLayout';
import type { Composition } from '../../../../composition';
import { useTuiStore } from './store/tuiStore';

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

  // Ref to break fetchTodayLog ↔ history circular dependency
  const fetchTodayLogRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useTerminalSize();

  const terminalSize = useTuiStore((s) => s.terminalSize);

  // Page navigation state
  const [page, setPage] = useState<Page>('main');
  const [displayNameInput, setDisplayNameInput] = useState(resolved.profile.displayName);
  const [savedDisplayName, setSavedDisplayName] = useState(resolved.profile.displayName);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'api-keys'>('profile');
  const [setupStep, setSetupStep] = useState(0);
  const [setupInput, setSetupInput] = useState('');
  const [apiKeysSelectedRow, setApiKeysSelectedRow] = useState(0);
  const [apiKeysEditingIndex, setApiKeysEditingIndex] = useState<number | null>(null);
  const [apiKeysEditInput, setApiKeysEditInput] = useState('');

  const { submit, getMaxChatScroll } = useChat(agent, renderer, fetchTodayLogRef, terminalSize.width);

  const { fetchTodayLog, getMaxTasksScroll } = useDataFetching(
    logs,
    todos,
    getMaxChatScroll,
    terminalSize.width
  );

  useEffect(() => { fetchTodayLogRef.current = fetchTodayLog; }, [fetchTodayLog]);

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
      } else if (!hasRequiredConfig() || (setupStep > 0 && setupStep <= SETUP_STEPS.length)) {
        setSetupInput(s => s + text);
      } else {
        useTuiStore.getState().setInput(s => s + text);
      }
    };
    keyHandler.on('paste', handler);
    return () => { keyHandler.off('paste', handler); };
  }, [keyHandler, page, settingsTab, apiKeysEditingIndex, setupStep]);

  useAppKeyboard({
    page,
    settingsTab,
    apiKeysEditingIndex,
    apiKeysEditInput,
    displayNameInput,
    setupInput,
    setupStep,
    apiKeysSelectedRow,
    resolved,
    setPage,
    setSettingsTab,
    setSetupStep,
    setSetupInput,
    setDisplayNameInput,
    setSavedDisplayName,
    setApiKeysSelectedRow,
    setApiKeysEditingIndex,
    setApiKeysEditInput,
    submit,
    getMaxTasksScroll,
    getMaxChatScroll,
    renderer,
    onConfigSaved,
  });

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

  return <MainLayout />;
}
