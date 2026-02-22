import type { DailyLog } from '../../../../domain/entities/DailyLog';
import type { PaxMood } from './constants/pax';

export function getPaxMood(
  thinking: boolean,
  todayLog: DailyLog | null | 'loading',
  todayLogLoadError: string | null,
  errorMessage: string | null,
  lastReply: string | null
): PaxMood {
  if (thinking) return 'thinking';
  if (todayLog === 'loading') return 'loading';
  if (todayLogLoadError || errorMessage) return 'sad';
  if (lastReply !== null) return 'laughing';
  return 'neutral';
}
