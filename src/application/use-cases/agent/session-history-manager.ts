import type { ILLMPort, ChatMessage } from '../../ports/llm-port';
import type { ISessionSummaryStore } from '../../ports/session-summary-store';
import { MAX_RECENT_MESSAGES, RETENTION_MESSAGES } from './agent-constants';

export class SessionHistoryManager {
  private readonly persistedMessages: ChatMessage[];
  private cachedSessionSummary: string | null;
  private lastSummarizedIndex = 0;

  constructor(
    private readonly llm: ILLMPort,
    private readonly sessionStore: ISessionSummaryStore
  ) {
    this.persistedMessages = sessionStore.loadRecentMessages(RETENTION_MESSAGES);
    this.cachedSessionSummary = sessionStore.load();
    if (this.persistedMessages.length > MAX_RECENT_MESSAGES) {
      this.lastSummarizedIndex = this.persistedMessages.length - MAX_RECENT_MESSAGES;
    }
  }

  /**
   * Returns history to send to the LLM and an optional summary of older turns.
   * When history exceeds MAX_RECENT_MESSAGES, older part is summarized and only recent messages are kept.
   * Uses incremental caching: only new messages are re-merged with the cached snapshot (not appended as prose).
   */
  async buildEffectiveHistory(
    history: ChatMessage[]
  ): Promise<{ effectiveHistory: ChatMessage[]; sessionSummary: string | null }> {
    // Merge persisted messages from prior sessions with the current session's history
    const fullHistory = [...this.persistedMessages, ...history];
    const recent = fullHistory.slice(-MAX_RECENT_MESSAGES);
    if (fullHistory.length <= MAX_RECENT_MESSAGES) {
      this.lastSummarizedIndex = 0;
      // Preserve the cross-session summary seed even when history is short
      return { effectiveHistory: fullHistory, sessionSummary: this.cachedSessionSummary };
    }
    const L = fullHistory.length - MAX_RECENT_MESSAGES;
    if (L < this.lastSummarizedIndex) {
      this.lastSummarizedIndex = 0;
      this.cachedSessionSummary = null;
    }
    if (L === this.lastSummarizedIndex) {
      // Already at the right boundary — return whatever summary we have (may be null when retained
      // messages provide raw context and no true overflow has occurred yet).
      return { effectiveHistory: recent, sessionSummary: this.cachedSessionSummary };
    }
    const oldPart = fullHistory.slice(0, L);
    let sessionSummary: string;
    if (this.lastSummarizedIndex === 0) {
      sessionSummary = await this.summarizeConversation(oldPart);
    } else {
      const newSlice = fullHistory.slice(this.lastSummarizedIndex, L);
      const newPartSummary = await this.summarizeConversation(newSlice);
      sessionSummary = await this.remergeWithExisting(this.cachedSessionSummary!, newPartSummary);
    }
    this.lastSummarizedIndex = L;
    this.cachedSessionSummary = sessionSummary;
    // Only persist when turns have actually fallen out of the raw retention window.
    // Within-session in-memory summaries overlap with retained raw messages and must not be stored.
    if (L > RETENTION_MESSAGES) {
      this.sessionStore.save(sessionSummary);
    }
    return { effectiveHistory: recent, sessionSummary };
  }

  /** Merges an existing state snapshot with a new partial summary into a single compact snapshot. */
  private async remergeWithExisting(existing: string, newPart: string): Promise<string> {
    const mergeMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are updating a session state snapshot. Merge the existing snapshot with new events from the conversation, producing a single updated snapshot in the same structured format. Preserve all specifics (task titles, dates, values). Drop anything superseded by newer info.',
      },
      {
        role: 'user',
        content: `Existing snapshot:\n${existing}\n\nNew events:\n${newPart}`,
      },
    ];
    const merged = await this.llm.chat(mergeMessages);
    return (merged ?? '').trim() || existing;
  }

  /**
   * One LLM call (no tools) to produce a structured state snapshot from older conversation turns.
   */
  private async summarizeConversation(messages: ChatMessage[]): Promise<string> {
    const transcript = messages
      .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : ''}`)
      .join('\n');
    const summarizerMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Build a structured state snapshot from this conversation. Use this format:\n\n' +
          '**Open tasks**: [task titles and statuses changed this session; omit section if none]\n' +
          '**Log updates**: [date, fields set and their values; omit section if none]\n' +
          '**Decisions**: [commitments, plans, deferred items; omit section if none]\n' +
          '**User context**: [mood, energy, focus area, anything Pax should remember; omit section if none]\n\n' +
          'Be specific — include task titles, exact dates, and numeric values. Skip small talk.',
      },
      { role: 'user', content: transcript },
    ];
    const summary = await this.llm.chat(summarizerMessages);
    return (summary ?? '').trim() || 'Earlier conversation.';
  }
}
