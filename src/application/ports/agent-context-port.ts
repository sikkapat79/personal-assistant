import type { AgentContext } from './agent-context';

export type { AgentContext } from './agent-context';

export interface IAgentContextPort {
  getContext(): Promise<AgentContext>;
}
