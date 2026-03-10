import type { ILogsRepository } from '../ports/logs-repository';
import type { ITodosRepository } from '../ports/todos-repository';
import type { IAgentContextPort } from '../ports/agent-context-port';
import type { IMetadataStore } from '../ports/metadata-store';
import type { ILLMPort, ChatMessage } from '../ports/llm-port';
import type { ISessionSummaryStore } from '../ports/session-summary-store';
import { AGENT_TOOLS } from '../dto/agent-tools';
import { todayLogDate } from '../../domain/value-objects/log-date';
import { SessionHistoryManager } from './agent/session-history-manager';
import { executeTools } from './agent/tool-executor';
import type { ToolDeps } from './agent/tool-executor';
import { buildSystemPrompt } from './agent/build-system-prompt';
import { buildCurrentStateSnapshot } from './agent/build-current-state-snapshot';
import { buildSchemaSummary } from './agent/build-schema-summary';
import { parseToolCalls } from './agent/parse-tool-calls';
import { RAW_TOOL_CALL_PATTERN, MAX_TOOL_ROUNDS, RETENTION_MESSAGES } from './agent/agent-constants';
export type { ToolCall } from './agent/tool-call';

export class AgentUseCase {
  private readonly historyManager: SessionHistoryManager;
  private readonly toolDeps: ToolDeps;
  private readonly llm: ILLMPort;
  private readonly sessionStore: ISessionSummaryStore;

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
    const [ctx, todayLog, openTodos, schemaSummary] = await Promise.all([
      this.context.getContext(),
      this.logs.findByDate(todayDate),
      this.todos.listOpen(),
      buildSchemaSummary(this.toolDeps.metadataStore),
    ]);
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
