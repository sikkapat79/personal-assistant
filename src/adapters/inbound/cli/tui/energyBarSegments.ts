/** Energy 1–100 to filled/empty bar segments (10 chars = tens). */
export function energyBarSegments(energy: number): { filled: string; empty: string } {
  const value = Math.min(100, Math.max(0, Math.round(energy)));
  const filledCount = Math.floor(value / 10);
  return { filled: '█'.repeat(filledCount), empty: '░'.repeat(10 - filledCount) };
}
