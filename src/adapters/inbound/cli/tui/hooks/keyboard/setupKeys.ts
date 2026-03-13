import type { KeyEvent } from '@opentui/core';
import { saveSettings, loadSettings } from '../../../../../../config/settings';
import { saveProfile } from '../../../../../../config/profile';
import { SETUP_STEPS } from '../../constants/setup';
import { printableInput } from '../../utils/textInput';
import type React from 'react';

export interface SetupKeyContext {
  setupStep: number;
  setupInput: string;
  setSetupStep: React.Dispatch<React.SetStateAction<number>>;
  setSetupInput: React.Dispatch<React.SetStateAction<string>>;
  setSavedDisplayName: React.Dispatch<React.SetStateAction<string>>;
  onConfigSaved: (() => void) | undefined;
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
      if (step.type === 'profile') {
        saveProfile({ displayName: ctx.setupInput.trim() });
        ctx.setSavedDisplayName(ctx.setupInput.trim());
      } else {
        const current = loadSettings();
        saveSettings({ ...current, [step.key]: ctx.setupInput.trim() });
      }
    }
    ctx.setSetupStep(s => s + 1);
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
