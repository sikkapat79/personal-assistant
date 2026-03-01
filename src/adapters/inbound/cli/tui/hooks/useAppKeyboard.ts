import React, { useRef, useEffect } from 'react';
import { useKeyboard, useRenderer } from '@opentui/react';
import { clearConsole } from '../utils/clearConsole';
import { saveSettings, loadSettings } from '../../../../../config/settings';
import { saveProfile } from '../../../../../config/profile';
import { SETUP_STEPS, SETTINGS_STEPS } from '../constants/setup';
import { getResolvedConfig, hasRequiredConfig } from '../../../../../config/resolved';
import type { Page } from '../types';
import { useTuiStore } from '../store/tuiStore';

interface AppKeyboardParams {
  // read values — will be mirrored to refs internally
  page: Page;
  settingsTab: 'profile' | 'api-keys';
  apiKeysEditingIndex: number | null;
  apiKeysEditInput: string;
  displayNameInput: string;
  setupInput: string;
  setupStep: number;
  apiKeysSelectedRow: number;
  resolved: ReturnType<typeof getResolvedConfig>;
  // stable setters (no ref needed)
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  setSettingsTab: React.Dispatch<React.SetStateAction<'profile' | 'api-keys'>>;
  setSetupStep: React.Dispatch<React.SetStateAction<number>>;
  setSetupInput: React.Dispatch<React.SetStateAction<string>>;
  setDisplayNameInput: React.Dispatch<React.SetStateAction<string>>;
  setSavedDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setApiKeysSelectedRow: React.Dispatch<React.SetStateAction<number>>;
  setApiKeysEditingIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setApiKeysEditInput: React.Dispatch<React.SetStateAction<string>>;
  // callbacks — mirror to refs
  submit: () => Promise<void>;
  getMaxTasksScroll: () => number;
  getMaxChatScroll: () => number;
  renderer: ReturnType<typeof useRenderer>;
  onConfigSaved?: () => void;
}

export function useAppKeyboard(params: AppKeyboardParams): void {
  // Mirror read-only values to refs
  const pageRef = useRef(params.page);
  useEffect(() => { pageRef.current = params.page; }, [params.page]);

  const settingsTabRef = useRef(params.settingsTab);
  useEffect(() => { settingsTabRef.current = params.settingsTab; }, [params.settingsTab]);

  const apiKeysEditingIndexRef = useRef(params.apiKeysEditingIndex);
  useEffect(() => { apiKeysEditingIndexRef.current = params.apiKeysEditingIndex; }, [params.apiKeysEditingIndex]);

  const apiKeysEditInputRef = useRef(params.apiKeysEditInput);
  useEffect(() => { apiKeysEditInputRef.current = params.apiKeysEditInput; }, [params.apiKeysEditInput]);

  const displayNameInputRef = useRef(params.displayNameInput);
  useEffect(() => { displayNameInputRef.current = params.displayNameInput; }, [params.displayNameInput]);

  const setupInputRef = useRef(params.setupInput);
  useEffect(() => { setupInputRef.current = params.setupInput; }, [params.setupInput]);

  const setupStepRef = useRef(params.setupStep);
  useEffect(() => { setupStepRef.current = params.setupStep; }, [params.setupStep]);

  const apiKeysSelectedRowRef = useRef(params.apiKeysSelectedRow);
  useEffect(() => { apiKeysSelectedRowRef.current = params.apiKeysSelectedRow; }, [params.apiKeysSelectedRow]);

  // Mirror callbacks to refs
  const submitRef = useRef(params.submit);
  useEffect(() => { submitRef.current = params.submit; }, [params.submit]);

  const getMaxTasksScrollRef = useRef(params.getMaxTasksScroll);
  useEffect(() => { getMaxTasksScrollRef.current = params.getMaxTasksScroll; }, [params.getMaxTasksScroll]);

  const getMaxChatScrollRef = useRef(params.getMaxChatScroll);
  useEffect(() => { getMaxChatScrollRef.current = params.getMaxChatScroll; }, [params.getMaxChatScroll]);

  const onConfigSavedRef = useRef(params.onConfigSaved);
  useEffect(() => { onConfigSavedRef.current = params.onConfigSaved; }, [params.onConfigSaved]);

  const rendererRef = useRef(params.renderer);
  useEffect(() => { rendererRef.current = params.renderer; }, [params.renderer]);

  const resolvedRef = useRef(params.resolved);
  useEffect(() => { resolvedRef.current = params.resolved; }, [params.resolved]);

  useKeyboard((key) => {
    // Global Ctrl+C - always exits regardless of page or focus
    if (key.ctrl && key.name === 'c') {
      clearConsole();
      rendererRef.current.destroy();
      process.exit(0);
      return;
    }

    // Helper - filters key.sequence to printable ASCII chars only
    function printableInput(k: { ctrl?: boolean; meta?: boolean; sequence?: string }): string {
      if (k.ctrl || k.meta) return '';
      return (k.sequence ?? '').replace(/[^\x20-\x7E]/g, '');
    }

    // Settings page input
    if (pageRef.current === 'settings') {
      // Escape cancels in-progress API key edit first; only then goes to main
      if (settingsTabRef.current === 'api-keys' && apiKeysEditingIndexRef.current !== null && key.name === 'escape') {
        params.setApiKeysEditingIndex(null);
        params.setApiKeysEditInput('');
        return;
      }
      if ((key.ctrl && key.name === 'p') || key.name === 'escape') {
        params.setPage('main');
        return;
      }
      if (key.name === 'tab') {
        if (settingsTabRef.current === 'profile') {
          params.setApiKeysSelectedRow(0); params.setApiKeysEditingIndex(null); params.setApiKeysEditInput('');
          params.setSettingsTab('api-keys');
        } else if (settingsTabRef.current === 'api-keys' && apiKeysEditingIndexRef.current === null) {
          const nextRow = apiKeysSelectedRowRef.current + 1;
          if (nextRow >= SETTINGS_STEPS.length) {
            params.setSettingsTab('profile');
          } else {
            params.setApiKeysSelectedRow(nextRow);
          }
        }
        return;
      }

      if (settingsTabRef.current === 'profile') {
        if (key.name === 'return') { saveProfile({ displayName: displayNameInputRef.current }); params.setSavedDisplayName(displayNameInputRef.current); return; }
        if (key.name === 'backspace' || key.name === 'delete') { params.setDisplayNameInput(s => s.slice(0, -1)); return; }
        const ch = printableInput(key);
        if (ch) params.setDisplayNameInput(s => s + ch);
        return;
      }

      if (settingsTabRef.current === 'api-keys') {
        if (apiKeysEditingIndexRef.current !== null) {
          if (key.name === 'return') {
            if (apiKeysEditInputRef.current.trim()) {
              const current = loadSettings();
              saveSettings({ ...current, [SETTINGS_STEPS[apiKeysEditingIndexRef.current].key]: apiKeysEditInputRef.current.trim() });
            }
            params.setApiKeysEditingIndex(null); params.setApiKeysEditInput(''); return;
          }
          if (key.name === 'escape') { params.setApiKeysEditingIndex(null); params.setApiKeysEditInput(''); return; }
          if (key.name === 'backspace' || key.name === 'delete') { params.setApiKeysEditInput(s => s.slice(0, -1)); return; }
          const ch = printableInput(key);
          if (ch) params.setApiKeysEditInput(s => s + ch);
          return;
        }
        // Not editing — navigation
        if (key.name === 'up') { params.setApiKeysSelectedRow(r => Math.max(0, r - 1)); return; }
        if (key.name === 'down') { params.setApiKeysSelectedRow(r => Math.min(SETTINGS_STEPS.length - 1, r + 1)); return; }
        if (key.name === 'return') { params.setApiKeysEditingIndex(apiKeysSelectedRowRef.current); params.setApiKeysEditInput(''); return; }
        return;
      }
    }

    // No-config wizard keyboard handling (show until user leaves confirmation)
    if (!hasRequiredConfig() || (setupStepRef.current > 0 && setupStepRef.current <= SETUP_STEPS.length)) {
      // Confirmation screen — Enter/Tab goes to main
      if (setupStepRef.current >= SETUP_STEPS.length) {
        if (key.name === 'return' || key.name === 'tab') {
          params.setSetupStep(0);
          params.setSetupInput('');
          onConfigSavedRef.current?.();
        }
        return;
      }
      // Regular step
      if (key.name === 'return' || key.name === 'tab' || key.name === 'escape') {
        if ((key.name === 'return' || key.name === 'tab') && setupInputRef.current.trim()) {
          const step = SETUP_STEPS[setupStepRef.current];
          if (step.type === 'profile') {
            saveProfile({ displayName: setupInputRef.current.trim() });
            params.setSavedDisplayName(setupInputRef.current.trim());
          } else {
            const current = loadSettings();
            saveSettings({ ...current, [step.key]: setupInputRef.current.trim() });
          }
        }
        params.setSetupStep(setupStepRef.current + 1); params.setSetupInput('');
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') { params.setSetupInput(s => s.slice(0, -1)); return; }
      const ch = printableInput(key);
      if (ch) params.setSetupInput(s => s + ch);
      return;
    }

    // Help modal - ? key toggles, any key closes when open
    if (useTuiStore.getState().showHelp) {
      useTuiStore.getState().setShowHelp(false);
      return;
    }
    // Check for ? (works with or without shift flag) - only when not typing
    if (useTuiStore.getState().input.length === 0 && (key.sequence === '?' || (key.name === '/' && key.shift))) {
      useTuiStore.getState().setShowHelp(true);
      return;
    }

    if (key.ctrl && key.name === 'p') {
      params.setDisplayNameInput(resolvedRef.current.profile.displayName);
      params.setSavedDisplayName(resolvedRef.current.profile.displayName);
      params.setSettingsTab('profile');
      params.setApiKeysSelectedRow(0); params.setApiKeysEditingIndex(null); params.setApiKeysEditInput('');
      params.setPage('settings');
      return;
    }

    // Tab key - cycle through sections
    if (key.name === 'tab') {
      const currentFocused = useTuiStore.getState().focusedSection;
      useTuiStore.getState().setFocusedSection(currentFocused === 'chat' ? 'tasks' : 'chat');
      return;
    }

    // Handle scroll keys for tasks and chat sections
    if (useTuiStore.getState().focusedSection === 'tasks') {
      if (key.name === 'up') {
        useTuiStore.getState().setTasksScrollOffset((offset) => Math.max(0, offset - 1));
        return;
      }
      if (key.name === 'down') {
        const maxScroll = getMaxTasksScrollRef.current();
        useTuiStore.getState().setTasksScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        return;
      }
      return; // Don't handle other keys
    }

    // Chat is focused - handle both scroll and input
    if (useTuiStore.getState().focusedSection === 'chat') {
      // Arrow keys scroll chat history
      if (key.name === 'up') {
        useTuiStore.getState().setChatScrollOffset((offset) => Math.max(0, offset - 1));
        return;
      }
      if (key.name === 'down') {
        const maxScroll = getMaxChatScrollRef.current();
        useTuiStore.getState().setChatScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        return;
      }
      // Fall through to handle input keys below
    } else {
      // Not chat focused, don't handle other keys
      return;
    }

    if (key.name === 'return') {
      const fn = submitRef.current;
      if (fn) void fn().catch((err) => console.error('Failed to submit chat input:', err));
      return;
    }

    if (key.name === 'backspace' || key.name === 'delete') {
      useTuiStore.getState().setInput((s) => s.slice(0, -1));
      return;
    }

    // Regular character input (use printableInput for consistency with other handlers)
    const ch = printableInput(key);
    if (ch) {
      useTuiStore.getState().setInput((s) => s + ch);
    }
  });
}
