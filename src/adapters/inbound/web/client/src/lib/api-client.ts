export type TodoStatus = 'Todo' | 'In Progress' | 'Done';
export type TodoCategory = 'Work' | 'Health' | 'Personal' | 'Learning';
export type TodoPriority = 'High' | 'Medium' | 'Low';

export interface TodoItem {
  id: string;
  title: string;
  dueDate: string | null;
  status: TodoStatus;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
}

export interface TodayResponse {
  date: string;
  todos: TodoItem[];
}

export interface CreateTodoInput {
  title: string;
  dueDate?: string | null;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
  status?: TodoStatus;
}

export interface UpdateTodoInput {
  title?: string;
  dueDate?: string | null;
  status?: TodoStatus;
  category?: TodoCategory;
  notes?: string;
  priority?: TodoPriority;
}

class ApiClient {
  private readonly base: string;
  private readonly token: string;

  constructor() {
    this.base = import.meta.env.VITE_API_URL ?? '';
    this.token = import.meta.env.VITE_API_TOKEN ?? '';
  }

  private headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${init?.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  getToday(): Promise<TodayResponse> {
    return this.request<TodayResponse>('/api/today');
  }

  getTodos(): Promise<TodoItem[]> {
    return this.request<TodoItem[]>('/api/todos');
  }

  createTodo(input: CreateTodoInput): Promise<TodoItem> {
    return this.request<TodoItem>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateTodo(id: string, patch: UpdateTodoInput): Promise<TodoItem> {
    return this.request<TodoItem>(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  completeTodo(id: string): Promise<void> {
    return this.request<void>(`/api/todos/${id}/complete`, { method: 'POST' });
  }
}

export const apiClient = new ApiClient();
