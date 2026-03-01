import React, { useCallback, useEffect } from 'react';
import type { useRenderer } from '@opentui/react';
import { useSpinner } from './useSpinner';
import { clearConsole } from '../utils/clearConsole';
import { calculateChatLineCount } from '../utils/wrapText';
import { getTuiLayoutMetrics } from '../utils/layoutMetrics';
import type { AgentUseCase } from '../../../../../application/use-cases/agent-use-case';
import { useTuiStore } from '../store/tuiStore';

export function useChat(
  agent: AgentUseCase | null,
  renderer: ReturnType<typeof useRenderer>,
  fetchTodayLogRef: React.MutableRefObject<() => Promise<void>>,
  terminalWidth: number
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
    const maxVisible = 15;
    const { chatContentWidth } = getTuiLayoutMetrics({ width: terminalWidth, height: 24 });
    const totalLines = calculateChatLineCount(history, chatContentWidth);
    return Math.max(0, totalLines - maxVisible);
  }, [terminalWidth]);

  const submit = useCallback(async () => {
    const { input, history, setInput, setThinking, appendHistory, setHistory } = useTuiStore.getState();
    const line = input.trim();
    setInput('');
    if (!line) return;

    if (line === 'exit' || line === 'quit') {
      clearConsole();
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (line === '/clear') {
      setHistory([]);
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
