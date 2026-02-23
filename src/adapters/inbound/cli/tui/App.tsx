import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { TextAttributes } from '@opentui/core';
import { useKeyboard, useRenderer, useAppContext } from '@opentui/react';
import type { DailyLog } from '../../../../domain/entities/daily-log';
import { getResolvedConfig, hasRequiredConfig } from '../../../../config/resolved';
import { saveProfile } from '../../../../config/profile';
import { loadSettings, saveSettings } from '../../../../config/settings';
import {
  fetchDatabasePropertyNames,
  suggestColumnMapping,
} from '../../../../adapters/outbound/notion/client';
import { AGENT_NAME, AGENT_TAGLINE } from '../../../../config/branding';
import { designTokens } from '../../../../design-tokens';
import { SETUP_STEPS } from './constants/setup';
import { TIPS } from './constants/tips';
import { ACTIVITY_VISIBLE_LINES, LAST_RESPONSE_LINES, FAKE_ENV_HINT } from './constants/layout';
import { energyBarSegments } from './energyBarSegments';
import { getPaxMood } from './getPaxMood';
import { clearConsole } from './clearConsole';
import { normalizeError } from './normalizeError';
import { formatTodayLoadError } from './formatTodayLoadError';
import { typeableChar } from './typeableChar';
import { useAgent } from './useAgent';
import { useSpinner } from './useSpinner';
import { usePaxAnimationFrame } from './usePaxAnimationFrame';
import type { Page, ColumnSuggestionRow } from './types';
import { FirstRunSetupContent } from './FirstRunSetupContent';
import { ColumnScanningContent } from './ColumnScanningContent';
import { ColumnMappingContent } from './ColumnMappingContent';
import { SettingsPageContent } from './SettingsPageContent';

export function App({ onConfigSaved }: { onConfigSaved?: () => void }) {
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
    if (line === '/clear') {
      setHistory([]);
      setLastReply('History cleared. Starting fresh.');
      setRecent((r) => ['History cleared.', ...r].slice(0, 8));
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
          <text fg={designTokens.color.muted}>{'\n? - this help\n/clear - clear chat history\nCtrl+P - Profile & Settings\nCtrl+C - exit\n↑ / ↓ - scroll recent activity\n\nPress any key to close'}</text>
        </box>
      )}
    </box>
  );
}
