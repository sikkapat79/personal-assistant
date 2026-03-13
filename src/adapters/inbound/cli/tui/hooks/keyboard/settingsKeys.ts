import type { KeyEvent } from '@opentui/core';
import { saveSettings, loadSettings } from '../../../../../../config/settings';
import { saveProfile } from '../../../../../../config/profile';
import { SETTINGS_STEPS } from '../../constants/setup';
import { printableInput } from '../../utils/textInput';
import type { Page } from '../../types';

export interface SettingsKeyContext {
  settingsTab: 'profile' | 'api-keys';
  apiKeysEditingIndex: number | null;
  apiKeysEditInput: string;
  displayNameInput: string;
  apiKeysSelectedRow: number;
  setPage: (page: Page) => void;
  setSettingsTab: (tab: 'profile' | 'api-keys') => void;
  setDisplayNameInput: (updater: string | ((s: string) => string)) => void;
  setSavedDisplayName: (name: string) => void;
  setApiKeysSelectedRow: (updater: number | ((r: number) => number)) => void;
  setApiKeysEditingIndex: (index: number | null) => void;
  setApiKeysEditInput: (updater: string | ((s: string) => string)) => void;
}

export function handleSettingsKey(key: KeyEvent, ctx: SettingsKeyContext): void {
  // Escape cancels an in-progress API key edit before closing the page
  if (ctx.settingsTab === 'api-keys' && ctx.apiKeysEditingIndex !== null && key.name === 'escape') {
    ctx.setApiKeysEditingIndex(null);
    ctx.setApiKeysEditInput('');
    return;
  }

  if ((key.ctrl && key.name === 'p') || key.name === 'escape') {
    ctx.setPage('main');
    return;
  }

  if (key.name === 'tab') {
    if (ctx.settingsTab === 'profile') {
      ctx.setApiKeysSelectedRow(0);
      ctx.setApiKeysEditingIndex(null);
      ctx.setApiKeysEditInput('');
      ctx.setSettingsTab('api-keys');
    } else if (ctx.settingsTab === 'api-keys' && ctx.apiKeysEditingIndex === null) {
      const nextRow = ctx.apiKeysSelectedRow + 1;
      if (nextRow >= SETTINGS_STEPS.length) {
        ctx.setSettingsTab('profile');
      } else {
        ctx.setApiKeysSelectedRow(nextRow);
      }
    }
    return;
  }

  if (ctx.settingsTab === 'profile') {
    if (key.name === 'return') {
      try {
        saveProfile({ displayName: ctx.displayNameInput });
        ctx.setSavedDisplayName(ctx.displayNameInput);
      } catch (e) {
        console.error('Failed to save profile:', e);
      }
      return;
    }
    if (key.name === 'backspace' || key.name === 'delete') {
      ctx.setDisplayNameInput(s => s.slice(0, -1));
      return;
    }
    const ch = printableInput(key);
    if (ch) ctx.setDisplayNameInput(s => s + ch);
    return;
  }

  if (ctx.settingsTab === 'api-keys') {
    if (ctx.apiKeysEditingIndex !== null) {
      if (key.name === 'return') {
        if (ctx.apiKeysEditInput.trim()) {
          try {
            const current = loadSettings();
            saveSettings({ ...current, [SETTINGS_STEPS[ctx.apiKeysEditingIndex].key]: ctx.apiKeysEditInput.trim() });
          } catch (e) {
            console.error('Failed to save settings:', e);
          }
        }
        ctx.setApiKeysEditingIndex(null);
        ctx.setApiKeysEditInput('');
        return;
      }
      if (key.name === 'escape') {
        ctx.setApiKeysEditingIndex(null);
        ctx.setApiKeysEditInput('');
        return;
      }
      if (key.name === 'backspace' || key.name === 'delete') {
        ctx.setApiKeysEditInput(s => s.slice(0, -1));
        return;
      }
      const ch = printableInput(key);
      if (ch) ctx.setApiKeysEditInput(s => s + ch);
      return;
    }
    // Not editing — row navigation
    if (key.name === 'up') { ctx.setApiKeysSelectedRow(r => Math.max(0, r - 1)); return; }
    if (key.name === 'down') { ctx.setApiKeysSelectedRow(r => Math.min(SETTINGS_STEPS.length - 1, r + 1)); return; }
    if (key.name === 'return') { ctx.setApiKeysEditingIndex(ctx.apiKeysSelectedRow); ctx.setApiKeysEditInput(''); return; }
  }
}
