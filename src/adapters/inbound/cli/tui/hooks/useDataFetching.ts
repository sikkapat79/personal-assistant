import { useCallback, useEffect } from 'react';
import { todayLogDate, createLogDate } from '../../../../../domain/log/log-date';
import type { ILogsRepository } from '../../../../../application/log/logs-repository.port';
import { wrapText } from '../utils/wrapText';
import { getTuiLayoutMetrics } from '../utils/layoutMetrics';
import type { TodosUseCase } from '../../../../../application/todo/todos-use-case';
import { useTuiStore } from '../store/tuiStore';


export function useDataFetching(
  logs: ILogsRepository | null,
  todos: TodosUseCase | null,
  getMaxChatScroll: () => number,
  terminalWidth: number,
  terminalHeight: number
): {
  fetchTodayLog: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchDoneTasks: () => Promise<void>;
  getMaxTasksScroll: () => number;
  scrollToTask: (taskIndex: number) => void;
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
      height: terminalHeight,
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
  }, [terminalWidth, terminalHeight]);

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

  const fetchDoneTasks = useCallback(async () => {
    if (!todos) {
      useTuiStore.getState().setDoneTasks([]);
      return;
    }
    try {
      const todayDate = new Date().toISOString().slice(0, 10);
      const done = await todos.listDoneToday(todayDate);
      useTuiStore.getState().setDoneTasks(done);
    } catch (e) {
      console.error('Failed to fetch done tasks:', e);
    }
  }, [todos]);

  // Poll tasks every 15 seconds
  useEffect(() => {
    if (!todos) return;
    const interval = setInterval(() => {
      fetchTasks(false); // Silent polling, no loading flash
    }, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [todos, fetchTasks]);

  // Scroll to keep a task visible (call after cursor moves)
  const scrollToTask = useCallback((taskIndex: number) => {
    const tasks = useTuiStore.getState().tasks;
    if (tasks.length === 0) return;
    const { maxTasksVisible, rightColumnWidth } = getTuiLayoutMetrics({
      width: terminalWidth,
      height: terminalHeight,
    });
    const contentWidth = rightColumnWidth - 6;

    // Compute line start of taskIndex
    let lineStart = 0;
    for (let i = 0; i < taskIndex && i < tasks.length; i++) {
      const t = tasks[i];
      const statusIcon = t.status === 'In Progress' ? '▶' : '○';
      const prefix = `${i + 1}. ${statusIcon} `;
      const suffix = t.priority ? ` (${t.priority})` : '';
      const wrapped = wrapText(t.title + suffix, Math.max(1, contentWidth - prefix.length));
      lineStart += wrapped.length;
    }

    const task = tasks[taskIndex];
    if (!task) return;
    const statusIcon = task.status === 'In Progress' ? '▶' : '○';
    const prefix = `${taskIndex + 1}. ${statusIcon} `;
    const suffix = task.priority ? ` (${task.priority})` : '';
    const wrapped = wrapText(task.title + suffix, Math.max(1, contentWidth - prefix.length));
    const lineEnd = lineStart + wrapped.length - 1;

    useTuiStore.getState().setTasksScrollOffset((offset) => {
      if (lineStart < offset) return lineStart;
      if (lineEnd >= offset + maxTasksVisible) return lineEnd - maxTasksVisible + 1;
      return offset;
    });
  }, [terminalWidth, terminalHeight]);

  // Clamp tasks scroll and selectedTaskIndex when tasks change (polling / post-write)
  useEffect(() => {
    useTuiStore.getState().setTasksScrollOffset((offset) => Math.min(offset, getMaxTasksScroll()));
    const { selectedTaskIndex, setSelectedTaskIndex } = useTuiStore.getState();
    if (tasks.length === 0) {
      setSelectedTaskIndex(0);
    } else if (selectedTaskIndex >= tasks.length) {
      setSelectedTaskIndex(tasks.length - 1);
    }
  }, [tasks, getMaxTasksScroll]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    useTuiStore.getState().setChatScrollOffset(getMaxChatScroll());
  }, [history, getMaxChatScroll]);

  return { fetchTodayLog, fetchTasks, fetchDoneTasks, getMaxTasksScroll, scrollToTask };
}
