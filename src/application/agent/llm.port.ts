import type { ChatMessage } from './chat-message';
import type { ToolDefinition } from './tool-definition';

export type { ChatMessage } from './chat-message';
export type { ToolDefinition } from './tool-definition';

export interface ILLMPort {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<string>;
  chatStream?(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<string>;
}
