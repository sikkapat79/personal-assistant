import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../design-tokens';
import { SETUP_STEPS } from './constants/setup';

export function FirstRunSetupContent({
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
