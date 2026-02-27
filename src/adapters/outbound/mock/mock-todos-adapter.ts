import type { ITodosRepository } from '../../../application/ports/todos-repository';
import type { TodoItemDto } from '../../../application/dto/todo-dto';
import mockDataJson from '../../../../fixtures/mock-data.json';

/**
 * Mock Todos Adapter - Returns sanitized data from fixtures
 * Use this for visual testing without external API calls
 */
export class MockTodosAdapter implements ITodosRepository {
  private mockData = mockDataJson;

  async listAll(): Promise<TodoItemDto[]> {
    return this.mockData.tasks as TodoItemDto[];
  }

  async listOpen(): Promise<TodoItemDto[]> {
    const tasks = this.mockData.tasks as TodoItemDto[];
    return tasks.filter(t => t.status === 'Todo' || t.status === 'In Progress');
  }

  async create(todo: Omit<TodoItemDto, 'id'>): Promise<TodoItemDto> {
    const newTodo: TodoItemDto = {
      ...todo,
      id: `mock-${Date.now()}`,
    };
    console.log('[MockTodosAdapter] create called (no-op):', newTodo.title);
    return newTodo;
  }

  async update(id: string, updates: Partial<TodoItemDto>): Promise<TodoItemDto> {
    const tasks = this.mockData.tasks as TodoItemDto[];
    const existing = tasks.find(t => t.id === id);
    if (!existing) {
      throw new Error(`Task ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    console.log('[MockTodosAdapter] update called (no-op):', id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    console.log('[MockTodosAdapter] delete called (no-op):', id);
  }
}
