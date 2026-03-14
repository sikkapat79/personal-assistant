import type { KeyEvent } from '@opentui/core';
import { saveSettings, loadSettings } from '../../../../../../config/settings';
import type { Settings } from '../../../../../../config/settings';
import { saveProfile } from '../../../../../../config/profile';
import { SETUP_STEPS } from '../../constants/setup';
import { printableInput } from '../../utils/textInput';
import type React from 'react';

export interface SetupKeyContext {
  setupStep: number;
  setupInput: string;
  currentDisplayName: string;
  setSetupStep: React.Dispatch<React.SetStateAction<number>>;
  setSetupInput: React.Dispatch<React.SetStateAction<string>>;
  setSavedDisplayName: React.Dispatch<React.SetStateAction<string>>;
  onConfigSaved: (() => void) | undefined;
}

/**
 * Returns the index of the first SETUP_STEPS entry with no value.
 * Used to initialize the wizard at the first missing field rather than always step 0.
 */
export function findFirstIncompleteStep(settings: Settings, profileDisplayName: string): number {
  for (let i = 0; i < SETUP_STEPS.length; i++) {
    const step = SETUP_STEPS[i];
    const value = step.type === 'profile' ? profileDisplayName : settings[step.key];
    if (!value) return i;
  }
  return SETUP_STEPS.length;
}

/** Returns the next step index, skipping steps that already have a value. */
function findNextStep(from: number, settings: Settings, profileDisplayName: string): number {
  let next = from + 1;
  while (next < SETUP_STEPS.length) {
    const step = SETUP_STEPS[next];
    const value = step.type === 'profile' ? profileDisplayName : settings[step.key];
    if (value) {
      next++;
    } else {
      break;
    }
  }
  return next;
}

export function handleSetupKey(key: KeyEvent, ctx: SetupKeyContext): void {
  // Confirmation screen — advance past it
  if (ctx.setupStep >= SETUP_STEPS.length) {
    if (key.name === 'return' || key.name === 'tab') {
      ctx.setSetupStep(0);
      ctx.setSetupInput('');
      ctx.onConfigSaved?.();
    }
    return;
  }

  if (key.name === 'return' || key.name === 'tab' || key.name === 'escape') {
    if ((key.name === 'return' || key.name === 'tab') && ctx.setupInput.trim()) {
      const step = SETUP_STEPS[ctx.setupStep];
      try {
        if (step.type === 'profile') {
          saveProfile({ displayName: ctx.setupInput.trim() });
          ctx.setSavedDisplayName(ctx.setupInput.trim());
        } else {
          const current = loadSettings();
          saveSettings({ ...current, [step.key]: ctx.setupInput.trim() });
        }
      } catch (e) {
        console.error('Failed to save config:', e);
      }
    }
    // Reload settings after potential save so skip logic sees the freshly written value
    const freshSettings = loadSettings();
    const nextIdx = findNextStep(ctx.setupStep, freshSettings, ctx.currentDisplayName);
    ctx.setSetupStep(nextIdx);
    ctx.setSetupInput('');
    return;
  }

  if (key.name === 'backspace' || key.name === 'delete') {
    ctx.setSetupInput(s => s.slice(0, -1));
    return;
  }

  const ch = printableInput(key);
  if (ch) ctx.setSetupInput(s => s + ch);
}
