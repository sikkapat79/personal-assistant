import { TextAttributes } from '@opentui/core';
import { getResolvedConfig } from '../../../../../config/resolved';
import { designTokens } from '../../../../../design-tokens';
import { maskSecret } from '../utils/maskSecret';
import { SETTINGS_STEPS, SECRET_KEYS } from '../constants/setup';

export function SettingsPageContent({
  displayNameInput,
  savedDisplayName,
  settingsTab,
  apiKeysSelectedRow,
  apiKeysEditingIndex,
  apiKeysEditInput,
  resolved,
}: {
  displayNameInput: string;
  savedDisplayName: string;
  settingsTab: 'profile' | 'api-keys';
  apiKeysSelectedRow: number;
  apiKeysEditingIndex: number | null;
  apiKeysEditInput: string;
  resolved: ReturnType<typeof getResolvedConfig>;
}) {
  const s = resolved.settings;
  const isDirty = displayNameInput !== savedDisplayName;
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      <text style={{ attributes: TextAttributes.BOLD }}>Profile & Settings</text>

      {/* Tab bar */}
      <box style={{ flexDirection: 'row', marginTop: 0 }}>
        <text
          fg={settingsTab === 'profile' ? designTokens.color.accent : designTokens.color.muted}
          style={{ attributes: settingsTab === 'profile' ? TextAttributes.BOLD : 0 }}
        >
          Profile
        </text>
        <text fg={designTokens.color.muted}>  |  </text>
        <text
          fg={settingsTab === 'api-keys' ? designTokens.color.accent : designTokens.color.muted}
          style={{ attributes: settingsTab === 'api-keys' ? TextAttributes.BOLD : 0 }}
        >
          API Keys
        </text>
      </box>

      {/* Tab content */}
      {settingsTab === 'profile' ? (
        <>
          <box style={{ marginTop: 1, flexDirection: 'column' }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Profile</text>
            <text fg={designTokens.color.muted}>Display name (Enter to save):</text>
            <box style={{ flexDirection: 'row', marginTop: 0 }}>
              <text>{'> ' + displayNameInput + '▌'}</text>
            </box>
            <text fg={isDirty ? designTokens.color.accent : designTokens.color.muted}>
              {isDirty ? `Current: ${savedDisplayName} → ${displayNameInput}` : `Current: ${savedDisplayName}`}
            </text>
          </box>
        </>
      ) : (
        <box style={{ marginTop: 1, flexDirection: 'column' }}>
          {SETTINGS_STEPS.map((step, i) => {
            const isSelected = apiKeysSelectedRow === i;
            const isEditing = apiKeysEditingIndex === i;
            const isSecret = SECRET_KEYS.has(step.key);
            const currentVal = s[step.key] as string | undefined;

            const valueDisplay = isEditing
              ? '> ' + (isSecret && apiKeysEditInput.length > 0
                  ? '•'.repeat(Math.min(apiKeysEditInput.length, 24))
                  : apiKeysEditInput) + '▌'
              : isSecret
                ? maskSecret(currentVal)
                : (currentVal && currentVal.length > 0 ? currentVal : 'Not set');

            return (
              <box key={step.key} style={{ flexDirection: 'row' }}>
                <text
                  fg={isSelected ? designTokens.color.accent : designTokens.color.muted}
                  style={{ attributes: isSelected ? TextAttributes.BOLD : 0 }}
                >
                  {(isSelected ? '> ' : '  ') + step.label + ': ' + valueDisplay}
                </text>
              </box>
            );
          })}
        </box>
      )}

      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.muted}>
          {settingsTab === 'api-keys' && apiKeysEditingIndex !== null
            ? 'Enter: save  Esc: cancel'
            : 'Tab: next field  Enter: edit  ↑↓: navigate  Ctrl+P or Esc: back'}
        </text>
      </box>
    </box>
  );
}
