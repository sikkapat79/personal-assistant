import OpenAI from 'openai';
import type { ILLMPort, ChatMessage, ToolDefinition } from '../../../application/ports/ILLMPort';

const DEFAULT_MODEL = 'gpt-4o-mini';

function toOpenAIMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function toOpenAITools(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters ?? { type: 'object', properties: {} },
    },
  }));
}

/** OpenAI LLM adapter. Uses OPENAI_API_KEY; supports tool/function calling. */
export class OpenAILLMAdapter implements ILLMPort {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model ?? DEFAULT_MODEL;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<string> {
    const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: toOpenAIMessages(messages),
    };
    if (tools && tools.length > 0) {
      body.tools = toOpenAITools(tools);
      body.tool_choice = 'auto';
    }

    const completion = await this.client.chat.completions.create(body);
    const message = completion.choices[0]?.message;
    if (!message) return '';

    const toolCalls = message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const parsed: { name: string; args: Record<string, unknown> }[] = [];
      for (const tc of toolCalls) {
        if (tc.type === 'function' && 'function' in tc) {
          const fn = tc.function;
          let args: Record<string, unknown> = {};
          try {
            if (fn.arguments) args = JSON.parse(fn.arguments) as Record<string, unknown>;
          } catch {
            // ignore
          }
          parsed.push({ name: fn.name, args });
        }
      }
      if (parsed.length > 0) return 'TOOL_CALLS: ' + JSON.stringify(parsed);
    }

    return (message.content as string) ?? '';
  }
}
