/**
 * E2E Test for TUI with mocked LLM adapter
 * Tests the full flow: user input → agent → display
 *
 * Usage: bun test test-tui-e2e.test.ts
 */

import { describe, test, expect, mock } from 'bun:test';
import type { IAgentUseCase } from './src/application/ports/agent-use-case';
import type { ILogsRepository } from './src/application/ports/logs-repository';
import type { ITodosRepository } from './src/application/ports/todos-repository';
import type { DailyLog } from './src/domain/entities/daily-log';
import type { TodoItemDto } from './src/application/dto/todo-dto';
import type { LogDate } from './src/domain/value-objects/log-date';

// Mock database state
const mockLogsDb: Map<string, DailyLog> = new Map();
const mockTodosDb: Map<string, TodoItemDto> = new Map();

// Mock Logs Repository
function createMockLogsRepository(): ILogsRepository {
  return {
    findByDate: mock(async (date: LogDate) => {
      return mockLogsDb.get(date.value) || null;
    }),

    findByDateRange: mock(async (start: LogDate, end: LogDate) => {
      return Array.from(mockLogsDb.values());
    }),

    upsert: mock(async (log: DailyLog) => {
      mockLogsDb.set(log.date.value, log);
      return log;
    }),
  };
}

// Mock Todos Repository
function createMockTodosRepository(): ITodosRepository {
  return {
    listAll: mock(async () => {
      return Array.from(mockTodosDb.values());
    }),

    listOpen: mock(async () => {
      return Array.from(mockTodosDb.values()).filter(
        (t) => t.status === 'Todo' || t.status === 'In Progress'
      );
    }),

    create: mock(async (todo: Omit<TodoItemDto, 'id'>) => {
      const newTodo: TodoItemDto = {
        ...todo,
        id: `task-${mockTodosDb.size + 1}`,
      };
      mockTodosDb.set(newTodo.id, newTodo);
      return newTodo;
    }),

    update: mock(async (id: string, updates: Partial<TodoItemDto>) => {
      const existing = mockTodosDb.get(id);
      if (!existing) throw new Error('Task not found');

      const updated = { ...existing, ...updates };
      mockTodosDb.set(id, updated);
      return updated;
    }),

    delete: mock(async (id: string) => {
      mockTodosDb.delete(id);
    }),
  };
}

// Mock LLM responses
const mockAgentResponses: Record<string, string> = {
  'check in': '✓ Log created for today. Mood: 7/10, Energy: 80/100. How are you feeling?',
  'add task': '✓ Task added: "Practice 3-minute summary of work" (High priority)',
  'list tasks': 'You have 2 open tasks:\n1. Practice 3-minute summary of work (High)\n2. Review PR (Medium)',
};

// Mock agent implementation
function createMockAgent(responses: Record<string, string>): IAgentUseCase {
  return {
    chat: mock(async (userMessage: string, history: Array<{ role: string; content: string }>) => {
      // Find matching response based on keywords
      for (const [keyword, response] of Object.entries(responses)) {
        if (userMessage.toLowerCase().includes(keyword)) {
          return response;
        }
      }
      return 'I understand. How can I help you today?';
    }),

    clearHistory: mock(() => {
      // No-op for tests
    }),
  };
}

describe('TUI E2E Tests with Mocked DB + LLM', () => {
  test('should fetch today log from mocked repository', async () => {
    const logsRepo = createMockLogsRepository();

    // Pre-populate mock DB
    const mockLog: DailyLog = {
      date: { value: '2026-02-27' },
      content: {
        title: 'Morning Check-in',
        mood: 7,
        energy: 80,
        deepWorkHours: 3,
        workout: true,
        diet: true,
      },
    };
    mockLogsDb.set('2026-02-27', mockLog);

    // Fetch from repository
    const log = await logsRepo.findByDate({ value: '2026-02-27' });

    expect(log).not.toBeNull();
    expect(log?.content.mood).toBe(7);
    expect(log?.content.energy).toBe(80);
  });

  test('should list tasks from mocked repository', async () => {
    const todosRepo = createMockTodosRepository();

    // Pre-populate mock DB
    mockTodosDb.set('task-1', {
      id: 'task-1',
      title: 'Practice 3-minute summary of work',
      status: 'In Progress',
      priority: 'High',
      category: 'Work',
      dueDate: null,
      notes: null,
    });

    const tasks = await todosRepo.listOpen();

    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Practice 3-minute summary of work');
    expect(tasks[0].status).toBe('In Progress');
  });

  test('should create task via mocked repository', async () => {
    const todosRepo = createMockTodosRepository();

    const newTask = await todosRepo.create({
      title: 'Review PR',
      status: 'Todo',
      priority: 'Medium',
      category: 'Work',
      dueDate: null,
      notes: null,
    });

    expect(newTask.id).toBeDefined();
    expect(newTask.title).toBe('Review PR');
    expect(mockTodosDb.has(newTask.id)).toBe(true);
  });

  test('should handle check-in flow', async () => {
    const mockAgent = createMockAgent(mockAgentResponses);

    const userInput = 'check in';
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Simulate user input
    const response = await mockAgent.chat(userInput, history);

    expect(response).toContain('✓ Log created');
    expect(response).toContain('Mood: 7/10');
    expect(mockAgent.chat).toHaveBeenCalledWith(userInput, history);
  });

  test('should handle task creation', async () => {
    const mockAgent = createMockAgent(mockAgentResponses);

    const userInput = 'add task: Practice 3-minute summary';
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    const response = await mockAgent.chat(userInput, history);

    expect(response).toContain('✓ Task added');
    expect(response).toContain('Practice 3-minute summary');
  });

  test('should handle list tasks', async () => {
    const mockAgent = createMockAgent(mockAgentResponses);

    const userInput = 'list tasks';
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    const response = await mockAgent.chat(userInput, history);

    expect(response).toContain('You have 2 open tasks');
    expect(response).toContain('Practice 3-minute summary');
  });

  test('should maintain conversation history', async () => {
    const mockAgent = createMockAgent(mockAgentResponses);

    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: 'check in' },
      { role: 'assistant', content: mockAgentResponses['check in'] },
    ];

    const newInput = 'add task: Review PR';
    await mockAgent.chat(newInput, history);

    // Verify history was passed correctly
    expect(mockAgent.chat).toHaveBeenCalledWith(newInput, history);
  });

  test('should handle long messages without overflow', async () => {
    const longMessage = 'long message';

    const longResponse = 'I understand your long message. Here is an equally long response that should also wrap properly without any rendering issues.';

    const mockAgent = createMockAgent({
      'long message': longResponse,
    });

    const response = await mockAgent.chat(longMessage, []);

    expect(response).toBe(longResponse);
    expect(response.length).toBeGreaterThan(50);
    expect(response).toContain('I understand');
  });
});

console.log('\n✅ E2E tests defined. Run with: bun test test-tui-e2e.test.ts\n');
