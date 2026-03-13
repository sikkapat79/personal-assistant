import type { KeyEvent } from '@opentui/core';
import { useTuiStore } from '../../store/tuiStore';
import type { TodosUseCase } from '@app/todo/todos-use-case';
import type { Page } from '../../types';

export interface TasksKeyContext {
  todos: TodosUseCase | null;
  fetchTasks: () => Promise<void>;
  scrollToTask: (index: number) => void;
  setPage: (page: Page) => void;
}

export function handleTasksKey(key: KeyEvent, ctx: TasksKeyContext): void {
  const { tasks, selectedTaskIndex } = useTuiStore.getState();

  if (key.name === 'up') {
    if (tasks.length === 0) return;
    const next = Math.max(0, selectedTaskIndex - 1);
    useTuiStore.getState().setSelectedTaskIndex(next);
    ctx.scrollToTask(next);
    return;
  }

  if (key.name === 'down') {
    const next = Math.max(-1, Math.min(tasks.length - 1, selectedTaskIndex + 1));
    useTuiStore.getState().setSelectedTaskIndex(next);
    if (next >= 0) ctx.scrollToTask(next);
    return;
  }

  if (key.name === 'space') {
    const task = tasks[selectedTaskIndex];
    if (task && ctx.todos) {
      if (task.status === 'Todo') {
        void ctx.todos.updateByIdOrIndex(task.id, { status: 'In Progress' })
          .then(() => ctx.fetchTasks())
          .catch(console.error);
      } else if (task.status === 'In Progress') {
        void ctx.todos.completeByIdOrIndex(task.id)
          .then(() => ctx.fetchTasks())
          .catch(console.error);
      }
    }
    return;
  }

  if (key.name === 'return') {
    const task = tasks[selectedTaskIndex];
    if (task) {
      useTuiStore.getState().setSelectedTask(task);
      ctx.setPage('task-detail');
    }
  }
}
