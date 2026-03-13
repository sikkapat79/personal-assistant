import { create } from 'zustand';
import type { DailyLog } from '@domain/log/daily-log';
import type { TodoItemDto } from '@app/todo/todo-dto';

interface TuiStoreState {
  terminalSize: { width: number; height: number };
  focusedSection: 'tasks' | 'chat';
  showHelp: boolean;
  input: string;
  cursorPos: number;
  history: { role: 'user' | 'assistant'; content: string }[];
  thinking: boolean;
  spinThinking: string;
  chatScrollOffset: number;
  inputScrollOffset: number;
  inputDisplayLines: number;
  tasks: TodoItemDto[];
  loadingTasks: boolean;
  tasksScrollOffset: number;
  selectedTaskIndex: number;
  selectedTask: TodoItemDto | null;
  todayLog: DailyLog | null;
  loadingLog: boolean;
  showStatusPicker: boolean;
  statusPickerIndex: number;
  doneTasks: TodoItemDto[];
}

interface TuiStoreActions {
  setTerminalSize: (size: { width: number; height: number }) => void;
  setFocusedSection: (section: 'tasks' | 'chat') => void;
  setShowHelp: (show: boolean) => void;
  setInput: (updater: string | ((prev: string) => string)) => void;
  setCursorPos: (pos: number) => void;
  setHistory: (history: { role: 'user' | 'assistant'; content: string }[]) => void;
  appendHistory: (messages: { role: 'user' | 'assistant'; content: string }[]) => void;
  setThinking: (thinking: boolean) => void;
  setSpinThinking: (frame: string) => void;
  setChatScrollOffset: (updater: number | ((prev: number) => number)) => void;
  setInputScrollOffset: (updater: number | ((prev: number) => number)) => void;
  setInputDisplayLines: (lines: number) => void;
  setTasks: (tasks: TodoItemDto[]) => void;
  setLoadingTasks: (loading: boolean) => void;
  setTasksScrollOffset: (updater: number | ((prev: number) => number)) => void;
  setSelectedTaskIndex: (index: number) => void;
  setSelectedTask: (task: TodoItemDto | null) => void;
  setTodayLog: (log: DailyLog | null) => void;
  setLoadingLog: (loading: boolean) => void;
  setShowStatusPicker: (show: boolean) => void;
  setStatusPickerIndex: (index: number) => void;
  setDoneTasks: (tasks: TodoItemDto[]) => void;
}

type TuiStore = TuiStoreState & TuiStoreActions;

export const useTuiStore = create<TuiStore>((set) => ({
  terminalSize: { width: process.stdout.columns || 80, height: process.stdout.rows || 24 },
  focusedSection: 'chat',
  showHelp: false,
  input: '',
  cursorPos: 0,
  history: [],
  thinking: false,
  spinThinking: '',
  chatScrollOffset: 0,
  inputScrollOffset: 0,
  inputDisplayLines: 2,
  tasks: [],
  loadingTasks: true,
  tasksScrollOffset: 0,
  selectedTaskIndex: 0,
  selectedTask: null,
  todayLog: null,
  loadingLog: true,
  showStatusPicker: false,
  statusPickerIndex: 0,
  doneTasks: [],

  setTerminalSize: (size) => set({ terminalSize: size }),
  setFocusedSection: (section) => set({ focusedSection: section }),
  setShowHelp: (show) => set({ showHelp: show }),
  setInput: (updater) => set((s) => ({
    input: typeof updater === 'function' ? updater(s.input) : updater,
  })),
  setCursorPos: (pos) => set({ cursorPos: pos }),
  setHistory: (history) => set({ history }),
  appendHistory: (messages) => set((s) => ({ history: [...s.history, ...messages] })),
  setThinking: (thinking) => set({ thinking }),
  setSpinThinking: (frame) => set({ spinThinking: frame }),
  setChatScrollOffset: (updater) => set((s) => ({
    chatScrollOffset: typeof updater === 'function' ? updater(s.chatScrollOffset) : updater,
  })),
  setInputScrollOffset: (updater) => set((s) => ({
    inputScrollOffset: typeof updater === 'function' ? updater(s.inputScrollOffset) : updater,
  })),
  setInputDisplayLines: (lines) => set({ inputDisplayLines: lines }),
  setTasks: (tasks) => set({ tasks }),
  setLoadingTasks: (loading) => set({ loadingTasks: loading }),
  setTasksScrollOffset: (updater) => set((s) => ({
    tasksScrollOffset: typeof updater === 'function' ? updater(s.tasksScrollOffset) : updater,
  })),
  setSelectedTaskIndex: (index) => set({ selectedTaskIndex: index }),
  setSelectedTask: (task) => set({ selectedTask: task }),
  setTodayLog: (log) => set({ todayLog: log }),
  setLoadingLog: (loading) => set({ loadingLog: loading }),
  setShowStatusPicker: (show) => set({ showStatusPicker: show }),
  setStatusPickerIndex: (index) => set({ statusPickerIndex: index }),
  setDoneTasks: (tasks) => set({ doneTasks: tasks }),
}));
