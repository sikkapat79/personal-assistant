import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';
import { SETUP_STEPS, SECRET_KEYS } from '../constants/setup';
import { maskSecret } from '../utils/maskSecret';
import type { Settings } from '../../../../../config/settings';

export function FirstRunSetupContent({
  setupStep,
  setupInput,
  currentValue,
  settings,
  displayName,
}: {
  setupStep: number;
  setupInput: string;
  currentValue?: string;
  settings?: Partial<Settings>;
  displayName?: string;
}) {
  const total = SETUP_STEPS.length;
  const isConfirmation = setupStep >= total;

  const tabBar = (
    <box style={{ flexDirection: 'row', marginTop: 1 }}>
      {SETUP_STEPS.map((s, i) => (
        <box key={s.key} style={{ flexDirection: 'row' }}>
          {i > 0 && <text fg={designTokens.color.muted}>  |  </text>}
          <text
            fg={!isConfirmation && i === setupStep ? designTokens.color.accent : designTokens.color.muted}
            style={{ attributes: !isConfirmation && i === setupStep ? TextAttributes.BOLD : 0 }}
          >
            {s.tab}
          </text>
        </box>
      ))}
      <text fg={designTokens.color.muted}>  |  </text>
      <text
        fg={isConfirmation ? designTokens.color.accent : designTokens.color.muted}
        style={{ attributes: isConfirmation ? TextAttributes.BOLD : 0 }}
      >
        Done
      </text>
    </box>
  );

  if (isConfirmation) {
    return (
      <box style={{ flexDirection: 'column', padding: 1 }}>
        <text style={{ attributes: TextAttributes.BOLD }}>First-run setup</text>
        {tabBar}
        <box style={{ marginTop: 1, flexDirection: 'column' }}>
          <text style={{ attributes: TextAttributes.BOLD }}>Setup complete!</text>
          <text fg={designTokens.color.muted}>Your settings have been saved to ~/.pa/settings.json</text>
        </box>
        <box style={{ marginTop: 1, flexDirection: 'column' }}>
          <text fg={designTokens.color.muted}>{'Name:              ' + (displayName || 'Not set')}</text>
          <text fg={designTokens.color.muted}>{'OpenAI key:        ' + maskSecret(settings?.OPENAI_API_KEY)}</text>
          <text fg={designTokens.color.muted}>{'AI model:          ' + (settings?.OPENAI_MODEL || 'Not set')}</text>
          <text fg={designTokens.color.muted}>{'Notion key:        ' + maskSecret(settings?.NOTION_API_KEY)}</text>
          <text fg={designTokens.color.muted}>{'Logs DB:           ' + (settings?.NOTION_LOGS_DATABASE_ID || 'Not set')}</text>
          <text fg={designTokens.color.muted}>{'TODOs DB:          ' + (settings?.NOTION_TODOS_DATABASE_ID || 'Not set')}</text>
          <text fg={designTokens.color.muted}>{'Metadata DB:       ' + (settings?.NOTION_METADATA_DATABASE_ID || 'Not set')}</text>
        </box>
        <box style={{ marginTop: 1 }}>
          <text fg={designTokens.color.muted}>Enter / Tab: go to Pax</text>
        </box>
      </box>
    );
  }

  const step = SETUP_STEPS[setupStep];
  if (!step) return null;
  const isSecret = step.type === 'settings' && SECRET_KEYS.has(step.key);
  const filled = setupStep + 1;
  const progressBar = '█'.repeat(filled) + '░'.repeat(total - filled);
  const maskedCurrent = currentValue
    ? (isSecret ? maskSecret(currentValue) : currentValue)
    : null;

  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <box style={{ flexDirection: 'row' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>First-run setup</text>
        <text fg={designTokens.color.muted}>{'  ' + progressBar + '  ' + filled + ' of ' + total}</text>
      </box>
      <text fg={designTokens.color.muted}>Enter required settings. They will be saved to ~/.pa/settings.json</text>
      {tabBar}
      <box style={{ marginTop: 1, flexDirection: 'column' }}>
        <text style={{ attributes: TextAttributes.BOLD }}>{step.label}</text>
        {maskedCurrent !== null ? (
          <text fg={designTokens.color.muted}>{'Current: ' + maskedCurrent}</text>
        ) : null}
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text>{'> ' + (isSecret && setupInput.length > 0 ? '•'.repeat(Math.min(setupInput.length, 24)) : setupInput) + '▌'}</text>
        </box>
      </box>
      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.muted}>Enter / Tab: save & next  Esc: skip</text>
      </box>
    </box>
  );
}
