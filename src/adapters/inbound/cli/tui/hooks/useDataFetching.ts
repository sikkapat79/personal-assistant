import { useCallback, useEffect } from 'react';
import { todayLogDate, createLogDate } from '../../../../../domain/value-objects/log-date';
import type { ILogsRepository } from '../../../../../application/ports/logs-repository';
import { wrapText } from '../utils/wrapText';
import { getTuiLayoutMetrics } from '../utils/layoutMetrics';
import type { TodosUseCase } from '../../../../../application/use-cases/todos-use-case';
import { useTuiStore } from '../store/tuiStore';

const AUTO_SCROLL_THRESHOLD = 3;

export function useDataFetching(
  logs: ILogsRepository | null,
  todos: TodosUseCase | null,
  getMaxChatScroll: () => number,
  terminalWidth: number
): {
  fetchTodayLog: () => Promise<void>;
  getMaxTasksScroll: () => number;
} {
  // Subscribed to trigger the auto-scroll effect when new messages arrive
  const history = useTuiStore((s) => s.history);
  // Subscribed to trigger the tasks scroll-clamp effect when tasks change
  const tasks = useTuiStore((s) => s.tasks);

  const getMaxTasksScroll = useCallback(() => {
    // Read fresh from store to avoid stale closure (outer `tasks` is only for effect deps)
    const tasks = useTuiStore.getState().tasks;
    const { maxTasksVisible, rightColumnWidth } = getTuiLayoutMetrics({
      width: terminalWidth,
      height: 24,
    });
    const contentWidth = rightColumnWidth - 6;

    let totalLines = 0;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const statusIcon = task.status === 'In Progress' ? '▶' : '○';
      const prefix = `${i + 1}. ${statusIcon} `;
      const suffix = task.priority ? ` (${task.priority})` : '';
      const wrapped = wrapText(task.title + suffix, Math.max(1, contentWidth - prefix.length));
      totalLines += wrapped.length;
    }
    return Math.max(0, totalLines - maxTasksVisible);
  }, [terminalWidth]);

  // Fetch today's log
  const fetchTodayLog = useCallback(async () => {
    if (!logs) {
      useTuiStore.getState().setTodayLog(null);
      useTuiStore.getState().setLoadingLog(false);
      return;
    }
    try {
      useTuiStore.getState().setLoadingLog(true);
      const today = todayLogDate();
      const log = await logs.findByDate(createLogDate(today));
      useTuiStore.getState().setTodayLog(log);
    } catch (e) {
      console.error('Failed to fetch today log:', e);
    } finally {
      useTuiStore.getState().setLoadingLog(false);
    }
  }, [logs]);

  // Fetch log on mount
  useEffect(() => {
    fetchTodayLog();
  }, [fetchTodayLog]);

  // Fetch open tasks
  const fetchTasks = useCallback(async (showLoading = false) => {
    if (!todos) {
      useTuiStore.getState().setTasks([]);
      useTuiStore.getState().setLoadingTasks(false);
      return;
    }
    try {
      if (showLoading) useTuiStore.getState().setLoadingTasks(true);
      const openTasks = await todos.listOpen();
      // Filter to show only Todo and In Progress status
      const activeTasks = openTasks.filter((t) => t.status === 'Todo' || t.status === 'In Progress');
      useTuiStore.getState().setTasks(activeTasks);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      if (showLoading) useTuiStore.getState().setLoadingTasks(false);
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
    useTuiStore.getState().setTasksScrollOffset((offset) => Math.min(offset, getMaxTasksScroll()));
  }, [tasks, getMaxTasksScroll]);

  // Auto-scroll chat to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    const maxScroll = getMaxChatScroll();
    useTuiStore.getState().setChatScrollOffset((current) =>
      current >= maxScroll - AUTO_SCROLL_THRESHOLD ? maxScroll : current
    );
  }, [history, getMaxChatScroll]);

  return { fetchTodayLog, getMaxTasksScroll };
}
