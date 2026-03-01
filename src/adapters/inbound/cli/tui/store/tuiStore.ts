import { create } from 'zustand';
import type { DailyLog } from '../../../../../domain/entities/daily-log';
import type { TodoItemDto } from '../../../../../application/dto/todo-dto';

interface TuiStoreState {
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

interface TuiStoreActions {
  setTerminalSize: (size: { width: number; height: number }) => void;
  setFocusedSection: (section: 'tasks' | 'chat') => void;
  setShowHelp: (show: boolean) => void;
  setInput: (updater: string | ((prev: string) => string)) => void;
  setHistory: (history: { role: 'user' | 'assistant'; content: string }[]) => void;
  appendHistory: (messages: { role: 'user' | 'assistant'; content: string }[]) => void;
  setThinking: (thinking: boolean) => void;
  setSpinThinking: (frame: string) => void;
  setChatScrollOffset: (updater: number | ((prev: number) => number)) => void;
  setTasks: (tasks: TodoItemDto[]) => void;
  setLoadingTasks: (loading: boolean) => void;
  setTasksScrollOffset: (updater: number | ((prev: number) => number)) => void;
  setTodayLog: (log: DailyLog | null) => void;
  setLoadingLog: (loading: boolean) => void;
}

type TuiStore = TuiStoreState & TuiStoreActions;

export const useTuiStore = create<TuiStore>((set) => ({
  terminalSize: { width: process.stdout.columns || 80, height: process.stdout.rows || 24 },
  focusedSection: 'chat',
  showHelp: false,
  input: '',
  history: [],
  thinking: false,
  spinThinking: '',
  chatScrollOffset: 0,
  tasks: [],
  loadingTasks: true,
  tasksScrollOffset: 0,
  todayLog: null,
  loadingLog: true,

  setTerminalSize: (size) => set({ terminalSize: size }),
  setFocusedSection: (section) => set({ focusedSection: section }),
  setShowHelp: (show) => set({ showHelp: show }),
  setInput: (updater) => set((s) => ({
    input: typeof updater === 'function' ? updater(s.input) : updater,
  })),
  setHistory: (history) => set({ history }),
  appendHistory: (messages) => set((s) => ({ history: [...s.history, ...messages] })),
  setThinking: (thinking) => set({ thinking }),
  setSpinThinking: (frame) => set({ spinThinking: frame }),
  setChatScrollOffset: (updater) => set((s) => ({
    chatScrollOffset: typeof updater === 'function' ? updater(s.chatScrollOffset) : updater,
  })),
  setTasks: (tasks) => set({ tasks }),
  setLoadingTasks: (loading) => set({ loadingTasks: loading }),
  setTasksScrollOffset: (updater) => set((s) => ({
    tasksScrollOffset: typeof updater === 'function' ? updater(s.tasksScrollOffset) : updater,
  })),
  setTodayLog: (log) => set({ todayLog: log }),
  setLoadingLog: (loading) => set({ loadingLog: loading }),
}));
