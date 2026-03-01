import React, { createContext, useContext } from 'react';
import type { DailyLog } from '../../../../../domain/entities/daily-log';
import type { TodoItemDto } from '../../../../../application/dto/todo-dto';

export interface TuiState {
  terminalSize: { width: number; height: number };
  focusedSection: 'tasks' | 'chat';
  showHelp: boolean;
  input: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  thinking: boolean;
  spinThinking: string;
  chatScrollOffset: number;
  tasks: TodoItemDto[];
  loadingTasks: boolean;
  tasksScrollOffset: number;
  todayLog: DailyLog | null;
  loadingLog: boolean;
}

export const TuiStateContext = createContext<TuiState | null>(null);

export function useTuiState(): TuiState {
  const ctx = useContext(TuiStateContext);
  if (!ctx) throw new Error('useTuiState must be used within TuiStateContext.Provider');
  return ctx;
}
