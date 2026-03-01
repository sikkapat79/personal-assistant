import { TextAttributes } from '@opentui/core';
import { designTokens } from '../../../../../design-tokens';

export function ColumnScanningContent({ spinner }: { spinner: string }) {
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
