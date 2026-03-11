import type { ILogsRepository } from '@app/log/logs-repository.port';
import type { ITodosRepository } from '@app/todo/todos-repository.port';
import type { IAgentContextPort } from './agent-context.port';
import type { IMetadataStore } from '@app/shared/metadata-store.port';
import type { ILLMPort, ChatMessage } from './llm.port';
import type { ISessionSummaryStore } from './session-summary-store.port';
import { AGENT_TOOLS } from './agent-tools';
import { todayLogDate } from '@domain/log/log-date';
import { SessionHistoryManager } from './session-history-manager';
import { executeTools } from './tool-executor';
import type { ToolDeps } from './tool-executor';
import { buildSystemPrompt } from './build-system-prompt';
import { buildCurrentStateSnapshot } from './build-current-state-snapshot';
import { buildSchemaSummary } from './build-schema-summary';
import { parseToolCalls } from './parse-tool-calls';
import { RAW_TOOL_CALL_PATTERN, MAX_TOOL_ROUNDS, RETENTION_MESSAGES } from './agent-constants';
export type { ToolCall } from './tool-call';

export class AgentUseCase {
  private readonly historyManager: SessionHistoryManager;
  private readonly toolDeps: ToolDeps;
  private readonly llm: ILLMPort;
  private readonly sessionStore: ISessionSummaryStore;
  private cachedContext: Awaited<ReturnType<IAgentContextPort['getContext']>> | null = null;
  private cachedSchemaSummary: string | null | undefined = undefined;

  constructor(
    private readonly logs: ILogsRepository,
    private readonly todos: ITodosRepository,
    private readonly context: IAgentContextPort,
    llm: ILLMPort,
    metadataStore: IMetadataStore,
    sessionStore: ISessionSummaryStore
  ) {
    this.llm = llm;
    this.sessionStore = sessionStore;
    this.toolDeps = { logs, todos, metadataStore };
    this.historyManager = new SessionHistoryManager(llm, sessionStore);
  }

  async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
    const todayDate = todayLogDate();
    if (!this.cachedContext) this.cachedContext = await this.context.getContext();
    if (this.cachedSchemaSummary === undefined) {
      this.cachedSchemaSummary = await buildSchemaSummary(this.toolDeps.metadataStore);
    }
    const [todayLog, openTodos] = await Promise.all([
      this.logs.findByDate(todayDate),
      this.todos.listOpen(),
    ]);
    const ctx = this.cachedContext;
    const schemaSummary = this.cachedSchemaSummary;
    const currentState = buildCurrentStateSnapshot(todayDate, todayLog, openTodos);
    const systemPrompt = buildSystemPrompt(ctx, todayDate, currentState, schemaSummary);
    const { effectiveHistory, sessionSummary } = await this.historyManager.buildEffectiveHistory(history);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(sessionSummary
        ? [{ role: 'system' as const, content: `Session context (earlier or prior sessions):\n${sessionSummary}` }]
        : []),
      ...effectiveHistory,
      { role: 'user', content: userMessage },
    ];
    let reply = await this.llm.chat(messages, AGENT_TOOLS);
    let rounds = 0;
    while (rounds < MAX_TOOL_ROUNDS) {
      const toolCalls = parseToolCalls(reply);
      if (toolCalls.length === 0) break;
      const results = await executeTools(toolCalls, this.toolDeps);
      const resultText = results.map((r) => `${r.name}: ${r.result}`).join('\n');
      messages.push({ role: 'assistant', content: reply });
      messages.push({
        role: 'user',
        content: `Tool results:\n${resultText}`,
      });
      reply = await this.llm.chat(messages, AGENT_TOOLS);
      rounds++;
    }
    if (reply && RAW_TOOL_CALL_PATTERN.test(reply.trim())) {
      messages.push({ role: 'assistant', content: reply });
      reply = await this.llm.chat(messages);
    }
    if (!reply || RAW_TOOL_CALL_PATTERN.test(reply.trim())) {
      reply = "Done. I've taken care of that.";
    }
    this.sessionStore.saveMessage('user', userMessage);
    this.sessionStore.saveMessage('assistant', reply);
    this.sessionStore.trimToLatest(RETENTION_MESSAGES);
    return reply;
  }
}
