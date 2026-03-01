import React, { useCallback, useEffect } from 'react';
import type { useRenderer } from '@opentui/react';
import { useSpinner } from './useSpinner';
import { clearConsole } from '../utils/clearConsole';
import { calculateChatLineCount } from '../utils/wrapText';
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
    const isWideScreen = terminalWidth >= 100;
    const availableWidth = terminalWidth - 2;
    const chatColumnWidth = Math.floor(availableWidth * (isWideScreen ? 0.62 : 0.6));
    const chatContentWidth = chatColumnWidth - 6;
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

    setThinking(true);

    try {
      const reply = await agent.chat(line, history);
      appendHistory([{ role: 'user', content: line }, { role: 'assistant', content: reply }]);
      fetchTodayLogRef.current();
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
