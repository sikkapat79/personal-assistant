import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createCliRenderer, TextAttributes } from '@opentui/core';
import { createRoot, useKeyboard, useRenderer } from '@opentui/react';
import { compose } from '../../../composition';
import type { DailyLog } from '../../../domain/entities/DailyLog';

/** Frame-based spinner for loading/thinking. */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_TICK_MS = 150;

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
  'To try without Notion: NOTION_API_KEY=x NOTION_LOGS_DATABASE_ID=x NOTION_TODOS_DATABASE_ID=x bun run tui';

const ACTIVITY_VISIBLE_LINES = 8;
const LAST_RESPONSE_LINES = 6;

function clearConsole(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function normalizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const firstLine = msg.split('\n')[0].trim();
  return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
}

function useAgent() {
  const [state] = useState<{ composition: ReturnType<typeof compose> | null; error: string | null }>(() => {
    try {
      return { composition: compose(), error: null };
    } catch (e) {
      return { composition: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
  if (state.error)
    return { agent: null, logs: null, todos: null, logUseCase: null, error: state.error };
  if (state.composition)
    return {
      agent: state.composition.agentUseCase,
      logs: state.composition.logs,
      todos: state.composition.todosUseCase,
      logUseCase: state.composition.logUseCase,
      error: null,
    };
  return { agent: null, logs: null, todos: null, logUseCase: null, error: null };
}

function useSpinner(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), SPINNER_TICK_MS);
    return () => clearInterval(id);
  }, [active]);
  return active ? SPINNER_FRAMES[frame] : SPINNER_FRAMES[0];
}

function App() {
  const renderer = useRenderer();
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
    return () => {
      cancelled = true;
    };
  }, [error, logs, todos]);

  const userName = process.env.USER || process.env.USERNAME || 'there';

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
      renderer.destroy();
      process.exit(0);
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
  }, [input, agent, history, renderer]);

  useKeyboard((key) => {
    if (key.name === 'return') {
      submit();
      return;
    }
    if (key.ctrl && key.name === 'c') {
      clearConsole();
      renderer.destroy();
      process.exit(0);
      return;
    }
    if (key.name === 'backspace' || key.name === 'delete') {
      setInput((s) => s.slice(0, -1));
      return;
    }
    if (key.name === 'up') {
      setActivityScroll((s) => Math.max(0, s - 1));
      return;
    }
    if (key.name === 'down') {
      setActivityScroll((s) => {
        const n = recentCountRef.current;
        const maxScroll = Math.max(0, n - ACTIVITY_VISIBLE_LINES);
        return Math.min(maxScroll, s + 1);
      });
      return;
    }
    if (key.name.length === 1 && !key.ctrl && !key.meta) {
      setInput((s) => s + key.name);
    }
  });

  if (error) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg="#FF0000" style={{ attributes: TextAttributes.BOLD }}>Could not start</text>
        <text fg="#FF0000">{error}</text>
        <box style={{ marginTop: 1 }}>
          <text fg="#888888">Set NOTION_API_KEY, NOTION_LOGS_DATABASE_ID, NOTION_TODOS_DATABASE_ID in .env (see .env.example).</text>
        </box>
        <box style={{ marginTop: 1 }}>
          <text fg="#888888">{FAKE_ENV_HINT}</text>
        </box>
      </box>
    );
  }

  const maxScroll = Math.max(0, recent.length - ACTIVITY_VISIBLE_LINES);
  const start = Math.min(activityScroll, maxScroll);
  const activityLines = recent.slice(start, start + ACTIVITY_VISIBLE_LINES);

  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <box style={{ flexDirection: 'row', marginBottom: 1 }}>
        <box style={{ width: '50%', flexDirection: 'column', paddingRight: 2 }}>
          <text style={{ attributes: TextAttributes.BOLD }}>PA · Self-discipline journal</text>
          <text>Welcome back {userName}!</text>
          <box style={{ marginTop: 1 }}>
            <text fg="#888888">{ROBOT}</text>
          </box>
          <text fg="#888888">Notion logs & TODOs · Agent</text>
          <box style={{ marginTop: 1, flexDirection: 'column' }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Last response</text>
            <box style={{ height: LAST_RESPONSE_LINES, overflow: 'hidden', flexDirection: 'column', marginTop: 0 }}>
              {lastReply !== null
                ? lastReply
                    .split('\n')
                    .slice(0, LAST_RESPONSE_LINES)
                    .map((line, i) => <text key={i}>{line}</text>)
                : thinking
                  ? (
                    <>
                      <text fg="#FFFF00">{spinThinking}</text>
                      <text fg="#FFFF00"> Thinking…</text>
                    </>
                    )
                  : (
                      <text fg="#888888">— Ask something to see the agent reply here.</text>
                    )}
            </box>
          </box>
          <box style={{ marginTop: 1, flexDirection: 'column' }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Today</text>
            {todayLog === 'loading' && (
              <>
                <text fg="#888888">{'\n'}</text>
                <text fg="#00FFFF">{spinLoading}</text>
                <text fg="#888888"> Loading…</text>
              </>
            )}
            {todayLog && todayLog !== 'loading' && (
              <text fg="#888888">
                {'\n' + (todayLog.content.title || 'Untitled') + (todayLog.content.notes ? ` — ${todayLog.content.notes.slice(0, 50)}${todayLog.content.notes.length > 50 ? '…' : ''}` : '')}
              </text>
            )}
            {!todayLog && (
              <text fg="#888888">{"\nNo log for today yet.\nHow did you sleep? How's your mood after waking up?"}</text>
            )}
          </box>
        </box>
        <box style={{ width: '50%', flexDirection: 'column', borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD }}>Tips</text>
          {TIPS.map((t, i) => (
            <text key={i} fg="#888888">{t}</text>
          ))}
          <box style={{ marginTop: 1 }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Recent activity</text>
            {recent.length > ACTIVITY_VISIBLE_LINES && <text fg="#888888"> ↑↓ scroll</text>}
          </box>
          <box style={{ height: ACTIVITY_VISIBLE_LINES, overflow: 'hidden', flexDirection: 'column' }}>
            {recent.length === 0
              ? <text fg="#888888">No recent activity</text>
              : activityLines.map((line, i) => (
                  <text key={start + i} fg="#888888">{line}</text>
                ))}
          </box>
        </box>
      </box>
      <box style={{ flexDirection: 'column', borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
        <text>{'> ' + input + '▌'}</text>
      </box>
      {errorMessage && (
        <box style={{ marginTop: 1 }}>
          <text fg="#FF0000">Error: {errorMessage}</text>
        </box>
      )}
      <box style={{ marginTop: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        <text fg="#888888">? for shortcuts</text>
        {thinking ? <text fg="#FFFF00">{spinThinking} Thinking…</text> : <text fg="#888888">Ready</text>}
      </box>
    </box>
  );
}

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<App />);
