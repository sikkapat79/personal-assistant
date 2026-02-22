export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}
