import { useState, useEffect } from 'react';
import { PAX_FACES, PAX_ANIMATION_TICK_MS, type PaxMood } from './constants/pax';

/** Returns current animated frame for the given mood (cycles on an interval). */
export function usePaxAnimationFrame(mood: PaxMood): string {
  const [frame, setFrame] = useState(0);
  const frames = PAX_FACES[mood];
  useEffect(() => setFrame(0), [mood]);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), PAX_ANIMATION_TICK_MS);
    return () => clearInterval(id);
  }, [mood, frames.length]);
  return frames[frame % frames.length];
}
