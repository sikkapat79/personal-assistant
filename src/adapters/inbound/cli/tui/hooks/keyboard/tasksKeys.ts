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

export function handleTasksKey(key: KeyEvent, ctx: TasksKeyContext): void {
  const store = useTuiStore.getState();
  const { tasks, selectedTaskIndex, showStatusPicker, statusPickerIndex } = store;

  // --- Status picker intercept (highest priority) ---
  if (showStatusPicker) {
    if (key.name === 'up') {
      store.setStatusPickerIndex(Math.max(0, statusPickerIndex - 1));
      return;
    }
    if (key.name === 'down') {
      store.setStatusPickerIndex(Math.min(2, statusPickerIndex + 1));
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
      const statusToIndex: Record<string, number> = { 'Todo': 0, 'In Progress': 1, 'Done': 2 };
      store.setStatusPickerIndex(statusToIndex[task.status] ?? 0);
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
