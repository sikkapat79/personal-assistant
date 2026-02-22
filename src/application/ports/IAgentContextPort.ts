export interface AgentContext {
  rules: string;
  docs: string[];
  skills: string[];
}

export interface IAgentContextPort {
  getContext(): Promise<AgentContext>;
}
