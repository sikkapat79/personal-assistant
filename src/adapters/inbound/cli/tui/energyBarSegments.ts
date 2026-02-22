/** Energy 1–10 to filled/empty bar segments (10 chars total). */
export function energyBarSegments(energy: number): { filled: string; empty: string } {
  const value = Math.min(10, Math.max(0, Math.round(energy)));
  return { filled: '█'.repeat(value), empty: '░'.repeat(10 - value) };
}
