import { useState, useEffect } from 'react';
import { SPINNER_FRAMES, SPINNER_TICK_MS } from '../constants/spinner';

export function useSpinner(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), SPINNER_TICK_MS);
    return () => clearInterval(id);
  }, [active]);
  return active ? SPINNER_FRAMES[frame] : SPINNER_FRAMES[0];
}
