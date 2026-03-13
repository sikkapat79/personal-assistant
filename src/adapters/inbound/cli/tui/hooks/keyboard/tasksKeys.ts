import type { KeyEvent } from '@opentui/core';
import { useTuiStore } from '../../store/tuiStore';
import type { TodosUseCase } from '@app/todo/todos-use-case';
import type { Page } from '../../types';

export interface TasksKeyContext {
  todos: TodosUseCase | null;
  fetchTasks: () => Promise<void>;
  fetchDoneTasks: () => Promise<void>;
  scrollToTask: (index: number) => void;
  setPage: (page: Page) => void;
}

const STATUSES = ['Todo', 'In Progress', 'Done'] as const;
const STATUS_TO_INDEX: Record<string, number> = { 'Todo': 0, 'In Progress': 1, 'Done': 2 };

export function handleTasksKey(key: KeyEvent, ctx: TasksKeyContext): void {
  const store = useTuiStore.getState();
  const { tasks, selectedTaskIndex, showStatusPicker, statusPickerIndex } = store;

  // --- Status picker intercept (highest priority) ---
  if (showStatusPicker) {
    const currentStatusIdx = STATUS_TO_INDEX[tasks[selectedTaskIndex]?.status ?? 'Todo'] ?? 0;

    if (key.name === 'up') {
      // Skip the disabled (current) status when navigating
      let next = statusPickerIndex - 1;
      if (next === currentStatusIdx) next--;
      if (next >= 0) store.setStatusPickerIndex(next);
      return;
    }
    if (key.name === 'down') {
      let next = statusPickerIndex + 1;
      if (next === currentStatusIdx) next++;
      if (next <= 2) store.setStatusPickerIndex(next);
      return;
    }
    if (key.name === 'escape') {
      store.setShowStatusPicker(false);
      return;
    }
    if (key.name === 'return') {
      const newStatus = STATUSES[statusPickerIndex];
      const targetTask = tasks[selectedTaskIndex];
      // No-op when selecting the current status
      if (targetTask && newStatus !== targetTask.status && ctx.todos) {
        const apply = async () => {
          if (newStatus === 'Done') {
            await ctx.todos!.completeByIdOrIndex(targetTask.id);
          } else {
            await ctx.todos!.updateByIdOrIndex(targetTask.id, { status: newStatus });
          }
          await ctx.fetchTasks();
          await ctx.fetchDoneTasks();
        };
        void apply().catch(console.error);
      }
      store.setShowStatusPicker(false);
      return;
    }
    // Any other key dismisses picker
    store.setShowStatusPicker(false);
    return;
  }

  // --- Open tasks cursor ---
  if (key.name === 'up') {
    if (tasks.length === 0) return;
    const next = Math.max(0, selectedTaskIndex - 1);
    store.setSelectedTaskIndex(next);
    ctx.scrollToTask(next);
    return;
  }

  if (key.name === 'down') {
    const next = Math.max(-1, Math.min(tasks.length - 1, selectedTaskIndex + 1));
    store.setSelectedTaskIndex(next);
    if (next >= 0) ctx.scrollToTask(next);
    return;
  }

  if (key.name === 'space') {
    const task = tasks[selectedTaskIndex];
    if (task) {
      const currentIdx = STATUS_TO_INDEX[task.status] ?? 0;
      // Default cursor to next stage (skip the disabled current status)
      store.setStatusPickerIndex((currentIdx + 1) % 3);
      store.setShowStatusPicker(true);
    }
    return;
  }

  if (key.name === 'return') {
    const task = tasks[selectedTaskIndex];
    if (task) {
      store.setSelectedTask(task);
      ctx.setPage('task-detail');
    }
  }
}
