import type { ILLMPort, ChatMessage } from '../../../application/ports/ILLMPort';

/** Stub LLM: returns a fixed message. Use when no API key is set. */
export class StubLLMAdapter implements ILLMPort {
  async chat(messages: ChatMessage[]): Promise<string> {
    const last = messages[messages.length - 1];
    if (last?.role === 'user' && last.content.toLowerCase().includes('hello')) {
      return 'Hello! Set OPENAI_API_KEY in .env to use the agent with OpenAI.';
    }
    return 'Agent is in stub mode. Set OPENAI_API_KEY in .env to enable.';
  }
}
