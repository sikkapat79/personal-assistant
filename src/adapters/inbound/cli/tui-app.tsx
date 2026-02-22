import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { createCliRenderer, TextAttributes } from '@opentui/core';
import { createRoot, useKeyboard, useRenderer, useAppContext } from '@opentui/react';
import { compose } from '../../../composition';
import type { DailyLog } from '../../../domain/entities/DailyLog';
import { getResolvedConfig, hasRequiredConfig } from '../../../config/resolved';
import { loadProfile, saveProfile } from '../../../config/profile';
import { loadSettings, saveSettings } from '../../../config/settings';
import {
  fetchDatabasePropertyNames,
  getColumnPurpose,
  suggestColumnMapping,
  type ColumnMappingEntry,
} from '../../../adapters/outbound/notion/client';
import { AGENT_NAME, AGENT_TAGLINE } from '../../../config/branding';
import { designTokens } from '../../../design-tokens';

/** Frame-based spinner for loading/thinking. */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_TICK_MS = 150;

const TIPS = [
  `Type a message and press Enter to talk to ${AGENT_NAME}.`,
  'Try "what are my open todos?" or "log today: shipped the feature".',
  '? for shortcuts · Ctrl+P: Profile & Settings · Ctrl+C to exit',
];

/** Energy 1–10 to filled/empty bar segments (10 chars total). */
function energyBarSegments(energy: number): { filled: string; empty: string } {
  const value = Math.min(10, Math.max(0, Math.round(energy)));
  return { filled: '█'.repeat(value), empty: '░'.repeat(10 - value) };
}

/** Animation tick for Pax face (slower than spinner so it stays calm). */
const PAX_ANIMATION_TICK_MS = 240;

type PaxMood = 'neutral' | 'thinking' | 'laughing' | 'loading' | 'sad';

/** Pax mascot (orb): silent AI presence. ASCII-only + fixed-width lines to avoid TUI misalignment.
 *  All frames are 5 lines with uniform 2-space indent to prevent layout jumping across moods.
 */
const PAX_FACES: Record<PaxMood, readonly string[]> = {
  neutral: [
    [
      '  .------.',
      ' / ...... \\',
      '| ..####.. |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ...... \\',
      '| .######. |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..::.. \\',
      '| .######. |',
      ' \\ ..::.. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ...... \\',
      '| ..####.. |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
  ],

  thinking: [
    [
      '  .------.',
      ' / ..::.. \\',
      '| .######. |',
      ' \\ ..::.. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ...::..\\',
      '| .######. |',
      ' \\..::... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ....:: \\',
      '| .######. |',
      ' \\ ::.... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..::...\\',
      '| .######. |',
      ' \\...::.. /',
      '  `------`',
    ].join('\n'),
  ],

  laughing: [
    [
      '  .------.',
      ' / ...... \\',
      '| ..####.. |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..**.. \\',
      '| .*####*. |',
      ' \\ ..**.. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..++.. \\',
      '| .+####+. |',
      ' \\ ..++.. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..**.. \\',
      '| .*####*. |',
      ' \\ ..**.. /',
      '  `------`',
    ].join('\n'),
  ],

  loading: [
    [
      '  .------.',
      ' / .::... \\',
      '| :####:. |',
      ' \\ ...::. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..::.. \\',
      '| :####:. |',
      ' \\ ..::.. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ...::. \\',
      '| :####:. |',
      ' \\ .::... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..::.. \\',
      '| :####:. |',
      ' \\ ..::.. /',
      '  `------`',
    ].join('\n'),
  ],

  sad: [
    [
      '  .------.',
      ' / ...... \\',
      '| ...##... |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ..::.. \\',
      '| ...##... |',
      ' \\ ..::.. /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ...... \\',
      '| ..####.. |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
    [
      '  .------.',
      ' / ...... \\',
      '| ...##... |',
      ' \\ ...... /',
      '  `------`',
    ].join('\n'),
  ],
};

/** Returns current animated frame for the given mood (cycles on an interval). */
function usePaxAnimationFrame(mood: PaxMood): string {
  const [frame, setFrame] = useState(0);
  const frames = PAX_FACES[mood];
  useEffect(() => setFrame(0), [mood]);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), PAX_ANIMATION_TICK_MS);
    return () => clearInterval(id);
  }, [mood, frames.length]);
  return frames[frame % frames.length];
}

function getPaxMood(thinking: boolean, todayLog: DailyLog | null | 'loading', todayLogLoadError: string | null, errorMessage: string | null, lastReply: string | null): PaxMood {
  if (thinking) return 'thinking';
  if (todayLog === 'loading') return 'loading';
  if (todayLogLoadError || errorMessage) return 'sad';
  if (lastReply !== null) return 'laughing';
  return 'neutral';
}

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

/** Format today-log load error; add hint when it's a Notion property type or name mismatch. */
function formatTodayLoadError(e: unknown): string {
  const msg = normalizeError(e);
  if (/could not find property|property with name or id/i.test(msg)) {
    return msg + ' — For Status (Todo/In Progress/Done): add NOTION_TODOS_DONE_VALUE=Done in Profile & Settings or ~/.pa/settings.json. NOTION_TODOS_STATUS defaults to "Status".';
  }
  if (/property type in the database does not match.*filter provided/i.test(msg) && /select does not match filter checkbox/i.test(msg)) {
    return msg + ' — Your TODOs "Done" column is a Status (select) in Notion. The app usually auto-detects this; if it failed, set NOTION_TODOS_DONE_VALUE and NOTION_TODOS_OPEN_VALUE in Profile & Settings or ~/.pa/settings.json (see .env.example).';
  }
  return msg;
}

function maskSecret(value: string | undefined): string {
  if (!value || value.length === 0) return 'Not set';
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '…' + value.slice(-4);
}

/** Returns the character to append for keypress, or null if not a typeable character. */
function typeableChar(key: { name: string; ctrl?: boolean; meta?: boolean; shift?: boolean }): string | null {
  if (key.ctrl || key.meta) return null;
  if (key.name === 'space') return ' ';
  if (key.name.length === 1) {
    // Parser sends A–Z as lowercase name + shift; use uppercase when shift is set
    if (key.shift && /^[a-z]$/.test(key.name)) return key.name.toUpperCase();
    return key.name;
  }
  return null;
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

type Page = 'main' | 'settings';

// Ask for the “brain” (OpenAI agent) first, then Notion data sources.
const SETUP_STEPS: { key: keyof import('../../../config/settings').Settings; label: string }[] = [
  { key: 'OPENAI_API_KEY', label: `OpenAI API key (optional, for ${AGENT_NAME})` },
  { key: 'OPENAI_MODEL', label: 'OpenAI model (optional, e.g. gpt-4o-mini)' },
  { key: 'NOTION_API_KEY', label: 'Notion API key (from notion.so/my-integrations)' },
  { key: 'NOTION_LOGS_DATABASE_ID', label: 'Notion Logs database ID (from the database URL)' },
  { key: 'NOTION_TODOS_DATABASE_ID', label: 'Notion TODOs database ID (from the database URL)' },
];

function FirstRunSetupContent({
  setupStep,
  setupInput,
}: {
  setupStep: number;
  setupInput: string;
}) {
  const step = SETUP_STEPS[setupStep];
  if (!step) return null;
  const isSecret = step.key === 'NOTION_API_KEY' || step.key === 'OPENAI_API_KEY';
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text style={{ attributes: TextAttributes.BOLD }}>First-run setup</text>
      <text fg={designTokens.color.muted}>Enter required settings. They will be saved to ~/.pa/settings.json</text>
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>
          Step {setupStep + 1} of {SETUP_STEPS.length}: {step.label}
        </text>
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text>{'> ' + (isSecret && setupInput.length > 0 ? '•'.repeat(Math.min(setupInput.length, 24)) : setupInput) + '▌'}</text>
        </box>
      </box>
      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.muted}>Press Enter to save and continue. Esc: skip (you can set later)</text>
      </box>
    </box>
  );
}

type ColumnSuggestionRow = ColumnMappingEntry & { suggested: string };

function ColumnScanningContent({ spinner }: { spinner: string }) {
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text style={{ attributes: TextAttributes.BOLD }}>Connecting to Notion</text>
      <text fg={designTokens.color.muted}>Scanning databases and matching columns…</text>
      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.loading}>{spinner}</text>
        <text fg={designTokens.color.muted}> Please wait.</text>
      </box>
    </box>
  );
}

function ColumnMappingContent({
  row,
  index,
  total,
  overrideInput,
}: {
  row: ColumnSuggestionRow;
  index: number;
  total: number;
  overrideInput: string;
}) {
  const label = `${row.entity === 'logs' ? 'Logs' : 'TODOs'} '${row.ourKey}'`;
  const purpose = getColumnPurpose(row.entity, row.ourKey);
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text style={{ attributes: TextAttributes.BOLD }}>Confirm column mapping</text>
      <text fg={designTokens.color.muted}>Enter = accept suggested, or type a different property name.</text>
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>
          Field {index + 1} of {total}: {label} → suggested: {row.suggested}
        </text>
        {purpose ? (
          <box style={{ marginTop: 0 }}>
            <text fg={designTokens.color.muted}>Purpose: {purpose}</text>
          </box>
        ) : null}
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text>{'> ' + overrideInput + '▌'}</text>
        </box>
      </box>
      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.muted}>Press Enter to use suggested or your typed name. Esc: skip column setup.</text>
      </box>
    </box>
  );
}

function SettingsPageContent({
  displayNameInput,
  setDisplayNameInput,
  resolved,
}: {
  displayNameInput: string;
  setDisplayNameInput: (s: string) => void;
  resolved: ReturnType<typeof getResolvedConfig>;
}) {
  const s = resolved.settings;
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text style={{ attributes: TextAttributes.BOLD }}>Profile & Settings</text>
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>Profile</text>
        <text fg={designTokens.color.muted}>Display name (Enter to save):</text>
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text>{'> ' + displayNameInput + '▌'}</text>
        </box>
        <text fg={designTokens.color.muted}>Current: {resolved.profile.displayName}</text>
      </box>
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>Settings</text>
<text fg={designTokens.color.muted}>Notion API key: {maskSecret(s.NOTION_API_KEY)}</text>
          <text fg={designTokens.color.muted}>Logs DB ID: {s.NOTION_LOGS_DATABASE_ID || 'Not set'}</text>
          <text fg={designTokens.color.muted}>TODOs DB ID: {s.NOTION_TODOS_DATABASE_ID || 'Not set'}</text>
          <text fg={designTokens.color.muted}>OpenAI API key: {maskSecret(s.OPENAI_API_KEY)}</text>
          <text fg={designTokens.color.muted}>OpenAI model: {s.OPENAI_MODEL ?? 'gpt-4o-mini'}</text>
      </box>
      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.muted}>Edit ~/.pa/settings.json or set env vars. Ctrl+P or Esc: Back to main</text>
      </box>
    </box>
  );
}

function App({ onConfigSaved }: { onConfigSaved?: () => void }) {
  const renderer = useRenderer();
  const [page, setPage] = useState<Page>(() => (hasRequiredConfig() ? 'main' : 'settings'));
  const [setupStep, setSetupStep] = useState<number | null>(() => (hasRequiredConfig() ? null : 0));
  const [setupPhase, setSetupPhase] = useState<'scanning' | 'mapping' | null>(null);
  const [columnSuggestions, setColumnSuggestions] = useState<ColumnSuggestionRow[] | null>(null);
  const [mappingStep, setMappingStep] = useState(0);
  const [mappingOverride, setMappingOverride] = useState('');
  const [confirmedColumnValues, setConfirmedColumnValues] = useState<Record<number, string>>({});
  const [columnScanError, setColumnScanError] = useState<string | null>(null);
  const [setupInput, setSetupInput] = useState('');
  const [settingsDisplayNameInput, setSettingsDisplayNameInput] = useState('');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activityScroll, setActivityScroll] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null | 'loading'>('loading');
  const [todayLogLoadError, setTodayLogLoadError] = useState<string | null>(null);
  const recentCountRef = useRef(0);
  const resolved = getResolvedConfig();
  const { agent, logs, todos, logUseCase, error } = useAgent();
  recentCountRef.current = recent.length;

  const spinLoading = useSpinner(todayLog === 'loading');
  const spinThinking = useSpinner(thinking);
  const spinScan = useSpinner(setupPhase === 'scanning');
  const paxMood = getPaxMood(thinking, todayLog, todayLogLoadError, errorMessage, lastReply);
  const paxFrame = usePaxAnimationFrame(paxMood);

  useEffect(() => {
    if (setupPhase !== 'scanning') return;
    setColumnScanError(null);
    let cancelled = false;
    (async () => {
      try {
        const s = loadSettings();
        const apiKey = s.NOTION_API_KEY;
        const logsId = s.NOTION_LOGS_DATABASE_ID;
        const todosId = s.NOTION_TODOS_DATABASE_ID;
        if (!apiKey || !logsId || !todosId) {
          setColumnScanError('Missing Notion API key or database IDs');
          setSetupPhase(null);
          return;
        }
        const [logsProps, todosProps] = await Promise.all([
          fetchDatabasePropertyNames(apiKey, logsId),
          fetchDatabasePropertyNames(apiKey, todosId),
        ]);
        if (cancelled) return;
        const suggestions = suggestColumnMapping(logsProps, todosProps);
        setColumnSuggestions(suggestions);
        setMappingStep(0);
        setMappingOverride('');
        setConfirmedColumnValues({});
        setSetupPhase('mapping');
      } catch (e) {
        if (!cancelled) {
          setColumnScanError(e instanceof Error ? e.message : String(e));
          setSetupPhase(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setupPhase]);

  useEffect(() => {
    if (error || !logs || !todos) return;
    const today = new Date().toISOString().slice(0, 10);
    let cancelled = false;
    setTodayLogLoadError(null);
    (async () => {
      try {
        const [log] = await Promise.all([logs.findByDate(today), todos.listOpen()]);
        if (!cancelled) {
          setTodayLog(log ?? null);
          setTodayLogLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setTodayLogLoadError(formatTodayLoadError(e));
          setTodayLog(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [error, logs, todos]);

  const userName = resolved.profile.displayName;

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
      // Refetch today's log in case the agent created or updated it
      if (logs) {
        const today = new Date().toISOString().slice(0, 10);
        try {
          const log = await logs.findByDate(today);
          setTodayLog(log ?? null);
          setTodayLogLoadError(null);
        } catch (e) {
          setTodayLogLoadError(formatTodayLoadError(e));
        }
      }
    } catch (e) {
      const msg = normalizeError(e);
      setErrorMessage(msg);
      setRecent((r) => ['Error: ' + msg, ...r].slice(0, 8));
    } finally {
      setThinking(false);
    }
  }, [input, agent, history, logs, renderer]);

  useKeyboard((key) => {
    const openSettings = () => setPage('settings');
    const goMain = () => setPage('main');
    if (showHelp) {
      setShowHelp(false);
      return;
    }
    if (page === 'main' && key.name === '?' && input.length === 0) {
      setShowHelp(true);
      return;
    }
    if (key.ctrl && key.name === 'p') {
      if (page === 'main') openSettings();
      else goMain();
      return;
    }
    if (key.name === 'escape') {
      if (page === 'settings') goMain();
      return;
    }
    if (page === 'settings') {
      if (columnScanError && key.name === 'escape') {
        setColumnScanError(null);
        onConfigSaved?.();
        return;
      }
      if (setupPhase === 'mapping' && columnSuggestions && columnSuggestions.length > 0) {
        const row = columnSuggestions[mappingStep];
        if (key.name === 'return') {
          const value = (mappingOverride.trim() || row?.suggested) ?? '';
          setConfirmedColumnValues((prev) => ({ ...prev, [mappingStep]: value }));
          setMappingOverride('');
          if (mappingStep >= columnSuggestions.length - 1) {
            const current = loadSettings();
            columnSuggestions.forEach((r, i) => {
              const v = i === mappingStep ? value : (confirmedColumnValues[i] ?? r.suggested) || r.suggested;
              (current as Record<string, string>)[r.settingsKey] = v;
            });
            saveSettings(current);
            setSetupPhase(null);
            setColumnSuggestions(null);
            setConfirmedColumnValues({});
            onConfigSaved?.();
          } else {
            setMappingStep((s) => s + 1);
          }
          return;
        }
        if (key.name === 'escape') {
          setSetupPhase(null);
          setColumnSuggestions(null);
          onConfigSaved?.();
          return;
        }
        if (key.name === 'backspace' || key.name === 'delete') {
          setMappingOverride((s) => s.slice(0, -1));
          return;
        }
        const cMap = typeableChar(key);
        if (cMap !== null) {
          setMappingOverride((s) => s + cMap);
          return;
        }
        return;
      }
      if (setupStep !== null) {
        if (key.name === 'return') {
          const step = SETUP_STEPS[setupStep];
          if (step) {
            const value = setupInput.trim();
            const current = loadSettings();
            (current as Record<string, string>)[step.key] = value;
            saveSettings(current);
            setSetupInput('');
            if (setupStep >= SETUP_STEPS.length - 1) {
              setSetupStep(null);
              setSetupPhase('scanning');
            } else {
              setSetupStep(setupStep + 1);
            }
          }
          return;
        }
        if (key.name === 'backspace' || key.name === 'delete') {
          setSetupInput((s) => s.slice(0, -1));
          return;
        }
        const c = typeableChar(key);
        if (c !== null) {
          setSetupInput((s) => s + c);
          return;
        }
        if (key.name === 'escape') {
          setSetupStep(null);
          return;
        }
        return;
      }
      if (key.name === 'return') {
        const name = settingsDisplayNameInput.trim();
        if (name.length > 0) {
          saveProfile({ displayName: name });
          setSettingsDisplayNameInput('');
        }
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') {
        setSettingsDisplayNameInput((s) => s.slice(0, -1));
        return;
      }
      const c2 = typeableChar(key);
      if (c2 !== null) {
        setSettingsDisplayNameInput((s) => s + c2);
        return;
      }
      return;
    }
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
    const c3 = typeableChar(key);
    if (c3 !== null) {
      setInput((s) => s + c3);
    }
  });

  const { keyHandler } = useAppContext();
  const inputStateRef = useRef({ page, setupStep, setupPhase });
  useLayoutEffect(() => {
    inputStateRef.current = { page, setupStep, setupPhase };
  });
  useEffect(() => {
    if (!keyHandler) return;
    const onPaste = (event: { text: string }) => {
      const text = (event.text ?? '').replace(/\r?\n/g, ' ').trimEnd();
      if (!text) return;
      const { page: p, setupStep: step, setupPhase: phase } = inputStateRef.current;
      if (p === 'settings') {
        if (phase === 'mapping') setMappingOverride((s) => s + text);
        else if (step !== null) setSetupInput((s) => s + text);
        else setSettingsDisplayNameInput((s) => s + text);
      } else {
        setInput((s) => s + text);
      }
    };
    keyHandler.on('paste', onPaste);
    return () => {
      keyHandler.off('paste', onPaste);
    };
  }, [keyHandler]);

  if (page === 'settings') {
    if (setupPhase === 'scanning') {
      return <ColumnScanningContent spinner={spinScan} />;
    }
    if (setupPhase === 'mapping' && columnSuggestions && columnSuggestions.length > 0) {
      const row = columnSuggestions[mappingStep];
      if (row) {
        return (
          <ColumnMappingContent
            row={row}
            index={mappingStep}
            total={columnSuggestions.length}
            overrideInput={mappingOverride}
          />
        );
      }
    }
    if (columnScanError) {
      return (
        <box style={{ flexDirection: 'column', padding: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD }} fg={designTokens.color.error}>Column scan failed</text>
          <text fg={designTokens.color.error}>{columnScanError}</text>
          <box style={{ marginTop: 1 }}>
            <text fg={designTokens.color.muted}>Esc: skip column setup and continue. You can edit ~/.pa/settings.json later.</text>
          </box>
        </box>
      );
    }
    if (setupStep !== null) {
      return (
        <FirstRunSetupContent setupStep={setupStep} setupInput={setupInput} />
      );
    }
    return (
      <SettingsPageContent
        displayNameInput={settingsDisplayNameInput}
        setDisplayNameInput={setSettingsDisplayNameInput}
        resolved={resolved}
      />
    );
  }

  if (error) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text fg={designTokens.color.error} style={{ attributes: TextAttributes.BOLD }}>Could not start</text>
        <text fg={designTokens.color.error}>{error}</text>
        <box style={{ marginTop: 1 }}>
          <text fg={designTokens.color.muted}>Press Ctrl+P to open Profile & Settings, or set in .env / ~/.pa/settings.json</text>
        </box>
        <box style={{ marginTop: 1 }}>
          <text fg={designTokens.color.muted}>{FAKE_ENV_HINT}</text>
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
          <box style={{ flexDirection: 'column', borderStyle: 'single', padding: 1, marginBottom: 1 }}>
            <text style={{ attributes: TextAttributes.BOLD }}>PA</text>
            <text fg={designTokens.color.muted}>Self-discipline journal</text>
            <box style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <text>Welcome back, {userName}</text>
              {todayLog && todayLog !== 'loading' && todayLog.content.energy != null && (
                <box style={{ flexDirection: 'row' }}>
                  <text fg={designTokens.color.muted}>Your energy </text>
                  <text fg={designTokens.color.accent}>{energyBarSegments(todayLog.content.energy).filled}</text>
                  <text fg={designTokens.color.muted}>{energyBarSegments(todayLog.content.energy).empty}</text>
                  <text fg={designTokens.color.muted}> {todayLog.content.energy}/10</text>
                </box>
              )}
            </box>
            <box style={{ marginTop: 1 }}>
              <text fg={designTokens.color.accent}>{paxFrame}</text>
            </box>
            <box style={{ flexDirection: 'row' }}>
              <text fg={designTokens.color.muted}>{AGENT_TAGLINE} · </text>
              <text fg={designTokens.color.accent}>{AGENT_NAME}</text>
            </box>
          </box>
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
                      <text fg={designTokens.color.thinking}>{spinThinking}</text>
                      <text fg={designTokens.color.thinking}> Thinking…</text>
                    </>
                    )
                  : (
                      <text fg={designTokens.color.muted}>— Ask something to see {AGENT_NAME} reply here.</text>
                    )}
            </box>
          </box>
          <box style={{ marginTop: 1, flexDirection: 'column' }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Today</text>
            {todayLog === 'loading' && (
              <>
                <text fg={designTokens.color.muted}>{'\n'}</text>
                <text fg={designTokens.color.loading}>{spinLoading}</text>
                <text fg={designTokens.color.muted}> Loading…</text>
              </>
            )}
            {todayLogLoadError && (
              <text fg={designTokens.color.error}>{'\nError loading: ' + todayLogLoadError}</text>
            )}
            {todayLog && todayLog !== 'loading' && !todayLogLoadError && (
              <text fg={designTokens.color.muted}>
                {'\n' + (todayLog.content.title || 'Untitled') + (todayLog.content.notes ? ` — ${todayLog.content.notes.slice(0, 50)}${todayLog.content.notes.length > 50 ? '…' : ''}` : '')}
              </text>
            )}
            {!todayLog && !todayLogLoadError && (
              <text fg={designTokens.color.muted}>{"\nNo log for today yet.\nHow did you sleep? How's your mood after waking up?"}</text>
            )}
          </box>
        </box>
        <box style={{ width: '50%', flexDirection: 'column', borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD }}>Tips</text>
          {TIPS.map((t, i) => (
            <text key={i} fg={designTokens.color.muted}>{t}</text>
          ))}
          <box style={{ marginTop: 1 }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Recent activity</text>
            {recent.length > ACTIVITY_VISIBLE_LINES && <text fg={designTokens.color.muted}> ↑↓ scroll</text>}
          </box>
          <box style={{ height: ACTIVITY_VISIBLE_LINES, overflow: 'hidden', flexDirection: 'column' }}>
            {recent.length === 0
              ? <text fg={designTokens.color.muted}>No recent activity</text>
              : activityLines.map((line, i) => (
                  <text key={start + i} fg={designTokens.color.muted}>{line}</text>
                ))}
          </box>
        </box>
      </box>
      <box style={{ flexDirection: 'column', borderStyle: 'single', paddingLeft: 1, paddingRight: 1 }}>
        <text>{'> ' + input + '▌'}</text>
      </box>
      {errorMessage && (
        <box style={{ marginTop: 1 }}>
          <text fg={designTokens.color.error}>Error: {errorMessage}</text>
        </box>
      )}
      <box style={{ marginTop: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        <text fg={designTokens.color.muted}>? for shortcuts</text>
        {thinking ? <text fg={designTokens.color.thinking}>{spinThinking} Thinking…</text> : <text fg={designTokens.color.muted}>Ready</text>}
      </box>
      {showHelp && (
        <box style={{ marginTop: 1, borderStyle: 'single', padding: 1, flexDirection: 'column' }}>
          <text style={{ attributes: TextAttributes.BOLD }}>Shortcuts</text>
          <text fg={designTokens.color.muted}>{'\n? - this help\nCtrl+P - Profile & Settings\nCtrl+C - exit\n↑ / ↓ - scroll recent activity\n\nPress any key to close'}</text>
        </box>
      )}
    </box>
  );
}

function AppRoot() {
  const [configVersion, setConfigVersion] = useState(0);
  return <App key={configVersion} onConfigSaved={() => setConfigVersion((v) => v + 1)} />;
}

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<AppRoot />);
