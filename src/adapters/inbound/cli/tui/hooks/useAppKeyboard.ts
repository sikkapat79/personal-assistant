import React, { useRef, useEffect } from 'react';
import { useKeyboard, useRenderer } from '@opentui/react';
import { clearConsole } from '../utils/clearConsole';
import { SETUP_STEPS } from '../constants/setup';
import { getResolvedConfig, hasRequiredConfig } from '../../../../../config/resolved';
import type { Page } from '../types';
import { useTuiStore } from '../store/tuiStore';
import type { TodosUseCase } from '@app/todo/todos-use-case';
import { handleSettingsKey } from './keyboard/settingsKeys';
import { handleSetupKey } from './keyboard/setupKeys';
import { handleTasksKey } from './keyboard/tasksKeys';
import { handleChatKey } from './keyboard/chatKeys';

interface AppKeyboardParams {
  // read values — mirrored to refs internally
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
  // callbacks — mirrored to refs
  submit: () => Promise<void>;
  getMaxTasksScroll: () => number;
  getMaxChatScroll: () => number;
  fetchTasks: () => Promise<void>;
  scrollToTask: (taskIndex: number) => void;
  todos: TodosUseCase | null;
  renderer: ReturnType<typeof useRenderer>;
  onConfigSaved?: () => void;
}

export function useAppKeyboard(params: AppKeyboardParams): void {
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

  const submitRef = useRef(params.submit);
  useEffect(() => { submitRef.current = params.submit; }, [params.submit]);

  const getMaxChatScrollRef = useRef(params.getMaxChatScroll);
  useEffect(() => { getMaxChatScrollRef.current = params.getMaxChatScroll; }, [params.getMaxChatScroll]);

  const onConfigSavedRef = useRef(params.onConfigSaved);
  useEffect(() => { onConfigSavedRef.current = params.onConfigSaved; }, [params.onConfigSaved]);

  const rendererRef = useRef(params.renderer);
  useEffect(() => { rendererRef.current = params.renderer; }, [params.renderer]);

  const resolvedRef = useRef(params.resolved);
  useEffect(() => { resolvedRef.current = params.resolved; }, [params.resolved]);

  const fetchTasksRef = useRef(params.fetchTasks);
  useEffect(() => { fetchTasksRef.current = params.fetchTasks; }, [params.fetchTasks]);

  const scrollToTaskRef = useRef(params.scrollToTask);
  useEffect(() => { scrollToTaskRef.current = params.scrollToTask; }, [params.scrollToTask]);

  const todosRef = useRef(params.todos);
  useEffect(() => { todosRef.current = params.todos; }, [params.todos]);

  useKeyboard((key) => {
    // Ctrl+C always exits regardless of page or focus
    if (key.ctrl && key.name === 'c') {
      clearConsole();
      rendererRef.current.destroy();
      process.exit(0);
      return;
    }

    // Task detail — Escape goes back to main
    if (pageRef.current === 'task-detail') {
      if (key.name === 'escape') params.setPage('main');
      return;
    }

    // Settings page
    if (pageRef.current === 'settings') {
      handleSettingsKey(key, {
        settingsTab: settingsTabRef.current,
        apiKeysEditingIndex: apiKeysEditingIndexRef.current,
        apiKeysEditInput: apiKeysEditInputRef.current,
        displayNameInput: displayNameInputRef.current,
        apiKeysSelectedRow: apiKeysSelectedRowRef.current,
        setPage: params.setPage,
        setSettingsTab: params.setSettingsTab,
        setDisplayNameInput: params.setDisplayNameInput,
        setSavedDisplayName: params.setSavedDisplayName,
        setApiKeysSelectedRow: params.setApiKeysSelectedRow,
        setApiKeysEditingIndex: params.setApiKeysEditingIndex,
        setApiKeysEditInput: params.setApiKeysEditInput,
      });
      return;
    }

    // First-run setup wizard
    if (!hasRequiredConfig() || (setupStepRef.current > 0 && setupStepRef.current <= SETUP_STEPS.length)) {
      handleSetupKey(key, {
        setupStep: setupStepRef.current,
        setupInput: setupInputRef.current,
        setSetupStep: params.setSetupStep,
        setSetupInput: params.setSetupInput,
        setSavedDisplayName: params.setSavedDisplayName,
        onConfigSaved: onConfigSavedRef.current,
      });
      return;
    }

    // Help modal — any key closes it
    if (useTuiStore.getState().showHelp) {
      useTuiStore.getState().setShowHelp(false);
      return;
    }

    // Toggle help — only when input is empty
    if (useTuiStore.getState().input.length === 0 && (key.sequence === '?' || (key.name === '/' && key.shift))) {
      useTuiStore.getState().setShowHelp(true);
      return;
    }

    // Open settings
    if (key.ctrl && key.name === 'p') {
      params.setDisplayNameInput(resolvedRef.current.profile.displayName);
      params.setSavedDisplayName(resolvedRef.current.profile.displayName);
      params.setSettingsTab('profile');
      params.setApiKeysSelectedRow(0);
      params.setApiKeysEditingIndex(null);
      params.setApiKeysEditInput('');
      params.setPage('settings');
      return;
    }

    // Tab cycles focus between chat and tasks
    if (key.name === 'tab') {
      const focused = useTuiStore.getState().focusedSection;
      useTuiStore.getState().setFocusedSection(focused === 'chat' ? 'tasks' : 'chat');
      return;
    }

    // Tasks section
    if (useTuiStore.getState().focusedSection === 'tasks') {
      handleTasksKey(key, {
        todos: todosRef.current,
        fetchTasks: fetchTasksRef.current,
        scrollToTask: scrollToTaskRef.current,
        setPage: params.setPage,
      });
      return;
    }

    // Chat section
    handleChatKey(key, {
      submit: submitRef.current,
      getMaxChatScroll: getMaxChatScrollRef.current,
    });
  });
}
