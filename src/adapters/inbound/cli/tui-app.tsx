import React, { useState, useCallback, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { compose } from '../../../composition';
import type { DailyLog } from '../../../domain/entities/DailyLog';

/** Frame-based spinner for loading/thinking. No extra deps. */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL_MS = 80;

function useSpinner(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), SPINNER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);
  return SPINNER_FRAMES[frame];
}

function useCursorBlink(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  return visible;
}

const TIPS = [
  'Type a message and press Enter to talk to the agent.',
  'Try "what are my open todos?" or "log today: shipped the feature".',
  '? for shortcuts · Ctrl+C to exit',
];

const ROBOT = `
  ▄▄▄▄▄
  █   █
  █ ◠ ◠ █
  █   █
  ▀▀▀▀▀
`.trim();

const FAKE_ENV_HINT =
  'To try without Notion: NOTION_API_KEY=x NOTION_LOGS_DATABASE_ID=x NOTION_TODOS_DATABASE_ID=x npm run tui';

/** Visible lines in the Recent activity box only (scrollable with ↑↓). */
const ACTIVITY_VISIBLE_LINES = 8;

/** Fixed height for Last response area (same prominence as landing block). */
const LAST_RESPONSE_LINES = 6;

/** Clear terminal screen and move cursor to top (ANSI). */
function clearConsole(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

/** Normalize error for display: first line, no stack, truncate. */
function normalizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const firstLine = msg.split('\n')[0].trim();
  const max = 120;
  return firstLine.length > max ? firstLine.slice(0, max) + '…' : firstLine;
}

function useAgent() {
  const [state] = useState<{ composition: ReturnType<typeof compose> | null; error: string | null }>(() => {
    try {
      return { composition: compose(), error: null };
    } catch (e) {
      return { composition: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
  if (state.error) return { agent: null, logs: null, todos: null, logUseCase: null, error: state.error };
  if (state.composition) return { agent: state.composition.agentUseCase, logs: state.composition.logs, todos: state.composition.todosUseCase, logUseCase: state.composition.logUseCase, error: null };
  return { agent: null, logs: null, todos: null, logUseCase: null, error: null };
}

const NO_LOG_PROMPT = 'No log for today yet. How did you sleep? How\'s your mood after waking up?';

function App() {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activityScroll, setActivityScroll] = useState(0);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null | 'loading'>('loading');
  const recentCountRef = useRef(0);
  const { agent, logs, todos, logUseCase, error } = useAgent();
  recentCountRef.current = recent.length;

  const spinLoading = useSpinner(todayLog === 'loading');
  const spinThinking = useSpinner(thinking);
  const cursorVisible = useCursorBlink();

  // On open: load only today's log for that specific date. If none, we'll ask the user.
  useEffect(() => {
    if (error || !logs || !todos) {
      if (!error) setTodayLog(null);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    let cancelled = false;
    (async () => {
      try {
        const [log] = await Promise.all([logs.findByDate(today), todos.listOpen()]);
        if (!cancelled) setTodayLog(log ?? null);
      } catch {
        if (!cancelled) setTodayLog(null);
      }
    })();
    return () => { cancelled = true; };
  }, [error, logs, todos]);

  const userName = process.env.USER || process.env.USERNAME || 'there';

  // Clear transient error after 6s
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 6000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  const submit = useCallback(async () => {
    const line = input.trim();
    setInput('');
    setErrorMessage(null);
    if (!line) return;
    if (line === 'exit' || line === 'quit') {
      clearConsole();
      exit();
      return;
    }
    if (!agent) return;
    setThinking(true);
    setLastReply(null);
    setActivityScroll(0);
    setRecent((r) => ['You: ' + line, ...r].slice(0, 8));
    try {
      const reply = await agent.chat(line, history);
      setHistory((h) => [...h, { role: 'user', content: line }, { role: 'assistant', content: reply }]);
      setLastReply(reply);
      setRecent((r) => ['Agent: ' + (reply.length > 60 ? reply.slice(0, 60) + '…' : reply), ...r].slice(0, 8));
    } catch (e) {
      const msg = normalizeError(e);
      setErrorMessage(msg);
      setRecent((r) => ['Error: ' + msg, ...r].slice(0, 8));
    } finally {
      setThinking(false);
    }
  }, [input, agent, history, exit]);

  useInput((input, key) => {
    if (key.return) {
      submit();
      return;
    }
    if (key.ctrl && input === 'c') {
      clearConsole();
      exit();
      return;
    }
    if (key.backspace || key.delete) {
      setInput((s) => s.slice(0, -1));
      return;
    }
    const up = key.upArrow || input === '\u001B[A';
    const down = key.downArrow || input === '\u001B[B';
    if (up) {
      setActivityScroll((s) => Math.max(0, s - 1));
      return;
    }
    if (down) {
      setActivityScroll((s) => {
        const n = recentCountRef.current;
        const maxScroll = Math.max(0, n - ACTIVITY_VISIBLE_LINES);
        return Math.min(maxScroll, s + 1);
      });
      return;
    }
    if (input) {
      setInput((s) => s + input);
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Could not start</Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Set NOTION_API_KEY, NOTION_LOGS_DATABASE_ID, NOTION_TODOS_DATABASE_ID in .env (see .env.example).</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{FAKE_ENV_HINT}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="row" marginBottom={1}>
        <Box width="50%" flexDirection="column" paddingRight={2}>
          <Text bold>PA · Self-discipline journal</Text>
          <Text>Welcome back {userName}!</Text>
          <Box marginTop={1}>
            <Text dimColor>{ROBOT}</Text>
          </Box>
          <Text dimColor>Notion logs & TODOs · Agent</Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Last response</Text>
            <Box height={LAST_RESPONSE_LINES} overflow="hidden" flexDirection="column" marginTop={0}>
              {lastReply !== null ? (
                lastReply.split('\n').slice(0, LAST_RESPONSE_LINES).map((line, i) => (
                  <Text key={i}>{line}</Text>
                ))
              ) : thinking ? (
                <>
                  <Text color="yellow">{spinThinking}</Text>
                  <Text color="yellow"> Thinking…</Text>
                </>
              ) : (
                <Text dimColor>— Ask something to see the agent reply here.</Text>
              )}
            </Box>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Today</Text>
            {todayLog === 'loading' && (
              <>
                <Text dimColor>{"\n"}</Text>
                <Text color="cyan">{spinLoading}</Text>
                <Text dimColor> Loading…</Text>
              </>
            )}
            {todayLog && todayLog !== 'loading' && (
              <Text dimColor>{"\n" + (todayLog.content.title || 'Untitled') + (todayLog.content.notes ? ` — ${todayLog.content.notes.slice(0, 50)}${todayLog.content.notes.length > 50 ? '…' : ''}` : '')}</Text>
            )}
            {!todayLog && (
              <Text dimColor>{"\nNo log for today yet.\nHow did you sleep? How's your mood after waking up?"}</Text>
            )}
          </Box>
        </Box>
        <Box width="50%" flexDirection="column" borderStyle="single" paddingX={1}>
          <Text bold>Tips</Text>
          {TIPS.map((t, i) => (
            <Text key={i} dimColor>{t}</Text>
          ))}
          <Box marginTop={1}>
            <Text bold>Recent activity</Text>
            {recent.length > ACTIVITY_VISIBLE_LINES && (
              <Text dimColor> ↑↓ scroll</Text>
            )}
          </Box>
          <Box height={ACTIVITY_VISIBLE_LINES} overflow="hidden" flexDirection="column">
            {recent.length === 0 ? (
              <Text dimColor>No recent activity</Text>
            ) : (
              (() => {
                const maxScroll = Math.max(0, recent.length - ACTIVITY_VISIBLE_LINES);
                const start = Math.min(activityScroll, maxScroll);
                return recent
                  .slice(start, start + ACTIVITY_VISIBLE_LINES)
                  .map((line, i) => (
                    <Text key={start + i} dimColor>{line}</Text>
                  ));
              })()
            )}
          </Box>
        </Box>
      </Box>
      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        <Text>{'> '}{input}{cursorVisible ? <Text color="cyan">▌</Text> : <Text dimColor> </Text>}</Text>
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color="red">Error: {errorMessage}</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="row" justifyContent="space-between">
        <Text dimColor>? for shortcuts</Text>
        {thinking ? <Text color="yellow">{spinThinking} Thinking…</Text> : <Text dimColor>Ready</Text>}
      </Box>
    </Box>
  );
}

render(<App />);
