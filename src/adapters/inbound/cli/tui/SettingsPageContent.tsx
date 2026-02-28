import { TextAttributes } from '@opentui/core';
import { getResolvedConfig } from '../../../../config/resolved';
import { designTokens } from '../../../../design-tokens';
import { maskSecret } from './maskSecret';
import { FirstRunSetupContent } from './FirstRunSetupContent';

export function SettingsPageContent({
  displayNameInput,
  setDisplayNameInput,
  savedDisplayName,
  settingsTab,
  setupStep,
  setupInput,
  resolved,
}: {
  displayNameInput: string;
  setDisplayNameInput: (s: string) => void;
  savedDisplayName: string;
  settingsTab: 'profile' | 'setup';
  setupStep: number;
  setupInput: string;
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
          fg={settingsTab === 'setup' ? designTokens.color.accent : designTokens.color.muted}
          style={{ attributes: settingsTab === 'setup' ? TextAttributes.BOLD : 0 }}
        >
          Setup
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
          <box style={{ marginTop: 1, flexDirection: 'column' }}>
            <text style={{ attributes: TextAttributes.BOLD }}>Settings</text>
            <text fg={designTokens.color.muted}>Notion API key: {maskSecret(s.NOTION_API_KEY)}</text>
            <text fg={designTokens.color.muted}>Logs DB ID: {s.NOTION_LOGS_DATABASE_ID || 'Not set'}</text>
            <text fg={designTokens.color.muted}>TODOs DB ID: {s.NOTION_TODOS_DATABASE_ID || 'Not set'}</text>
            <text fg={designTokens.color.muted}>Parent page ID: {s.NOTION_PAGES_PARENT_ID || 'Not set'}</text>
            {s.NOTION_PAGES_PARENT_ID ? (
              <text fg={designTokens.color.muted}>Caution: If Pax creates a "Pax Metadata" database under this page, do not edit it manually—use Pax to change settings.</text>
            ) : null}
            <text fg={designTokens.color.muted}>OpenAI API key: {maskSecret(s.OPENAI_API_KEY)}</text>
            <text fg={designTokens.color.muted}>OpenAI model: {s.OPENAI_MODEL ?? 'gpt-4o-mini'}</text>
          </box>
        </>
      ) : (
        <FirstRunSetupContent setupStep={setupStep} setupInput={setupInput} />
      )}

      <box style={{ marginTop: 1 }}>
        <text fg={designTokens.color.muted}>Tab: switch | Ctrl+P or Esc: back to main</text>
      </box>
    </box>
  );
}
