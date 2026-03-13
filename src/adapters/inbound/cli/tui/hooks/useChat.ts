import React, { useCallback, useEffect } from 'react';
import type { useRenderer } from '@opentui/react';
import { useSpinner } from './useSpinner';
import { clearConsole } from '../utils/clearConsole';
import { calculateChatLineCount } from '../utils/wrapText';
import { getTuiLayoutMetrics } from '../utils/layoutMetrics';
import type { AgentUseCase } from '@app/agent/agent-use-case';
import { useTuiStore } from '../store/tuiStore';

export function useChat(
  agent: AgentUseCase | null,
  renderer: ReturnType<typeof useRenderer>,
  fetchTodayLogRef: React.MutableRefObject<() => Promise<void>>,
  terminalWidth: number,
  terminalHeight: number
): {
  submit: () => Promise<void>;
  getMaxChatScroll: () => number;
} {
  const thinking = useTuiStore((s) => s.thinking);
  const spinFrame = useSpinner(thinking);

  useEffect(() => {
    useTuiStore.getState().setSpinThinking(spinFrame);
  }, [spinFrame]);

  const getMaxChatScroll = useCallback(() => {
    const history = useTuiStore.getState().history;
    const { chatContentWidth, maxChatLines, inputMaxLines } = getTuiLayoutMetrics({ width: terminalWidth, height: terminalHeight });
    const inputDisplayLines = useTuiStore.getState().inputDisplayLines;
    const adjustedMaxChatLines = Math.max(5, maxChatLines - (inputDisplayLines - inputMaxLines));
    const totalLines = calculateChatLineCount(history, chatContentWidth);
    return Math.max(0, totalLines - adjustedMaxChatLines);
  }, [terminalWidth, terminalHeight]);

  const submit = useCallback(async () => {
    const { input, history, setInput, setCursorPos, setThinking, appendHistory, setHistory } = useTuiStore.getState();
    const line = input.trim();
    setInput('');
    setCursorPos(0);
    if (!line) return;

    if (line === 'exit' || line === 'quit') {
      clearConsole();
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (line === '/clear') {
      setHistory([]);
      try {
        agent?.clearHistory();
      } catch (e) {
        appendHistory([{ role: 'assistant', content: `Failed to clear session: ${e instanceof Error ? e.message : String(e)}` }]);
      }
      return;
    }

    if (!agent) return;
    if (useTuiStore.getState().thinking) return;

    setThinking(true);

    try {
      const reply = await agent.chat(line, history);
      appendHistory([{ role: 'user', content: line }, { role: 'assistant', content: reply }]);
      void fetchTodayLogRef.current?.()?.catch((err) => {
        console.error('Failed to refresh today log:', err);
      });
    } catch (e) {
      appendHistory([
        { role: 'user', content: line },
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setThinking(false);
    }
  }, [agent, fetchTodayLogRef, renderer]);

  return { submit, getMaxChatScroll };
}
