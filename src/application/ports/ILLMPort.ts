export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface ILLMPort {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<string>;
  chatStream?(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<string>;
}
