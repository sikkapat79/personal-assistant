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
    // TODO(#21): VITE_API_TOKEN is a temporary dev-only scaffold — a bearer token
    // baked into the client bundle is not suitable for production. Once Better Auth
    // is implemented (#21), auth will use httpOnly session cookies issued by the
    // server and this env var (and the Authorization header below) can be removed.
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

  updateTodo(id: string, patch: UpdateTodoInput): Promise<{ ok: true }> {
    return this.request<{ ok: true }>(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  completeTodo(id: string): Promise<{ ok: true }> {
    return this.request<{ ok: true }>(`/api/todos/${id}/complete`, { method: 'POST' });
  }
}

export const apiClient = new ApiClient();
