/** Design tokens for TUI (and any future UI). Single source for colors and optional spacing. */
export const designTokens = {
  color: {
    muted: '#888888',
    error: '#FF0000',
    loading: '#00FFFF',
    thinking: '#FFFF00',
    /** Brand/accent for Pax and key UI highlights (calm, distinct on dark bg). */
    accent: '#5EEAD4',
  },
} as const;
