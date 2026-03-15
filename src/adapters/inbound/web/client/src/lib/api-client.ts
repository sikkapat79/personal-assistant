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

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface SessionResponse {
  user: SessionUser;
  session: { id: string; expiresAt: string };
}

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private readonly base: string;

  constructor() {
    this.base = import.meta.env.VITE_API_URL ?? '';
  }

  private async request<Value>(path: string, init: RequestInit = {}): Promise<Value> {
    const headers = new Headers(init.headers);
    if (init.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(`${this.base}${path}`, { ...init, credentials: 'include', headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(`API ${init?.method ?? 'GET'} ${path} → ${res.status}: ${text}`, res.status);
    }
    return res.json() as Promise<Value>;
  }

  getSession(): Promise<SessionResponse | null> {
    return this.request<SessionResponse | null>('/api/auth/get-session').catch((err: unknown) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
      throw err;
    });
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
