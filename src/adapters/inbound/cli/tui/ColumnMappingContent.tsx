import { TextAttributes } from '@opentui/core';
import { getColumnPurpose } from '../../../../adapters/outbound/notion/client';
import { designTokens } from '../../../../design-tokens';
import type { ColumnSuggestionRow } from './types';

export function ColumnMappingContent({
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
