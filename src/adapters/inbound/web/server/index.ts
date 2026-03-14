import type { TodoAddInputDto } from '@app/todo/todo-dto';
import type { TodoUpdatePatch } from '@app/todo/todo-update-patch';
import { join, resolve, relative } from 'path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createTursoDb } from '../../../../adapters/outbound/turso/client';
import { getResolvedConfig } from '../../../../config/resolved';
import { getConfigDir } from '../../../../config/config-dir';
import { createAuth } from './auth';
import { getCompositionForUser } from './user-composition';

const PORT = Number(process.env.PORT ?? 3001);
const PUBLIC_DIR = join(import.meta.dir, 'public');
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';

const { settings } = getResolvedConfig();
const configDir = getConfigDir();
const dbPath = join(configDir, 'turso.db');
const db = createTursoDb({
  tursoUrl: settings.TURSO_URL ?? '',
  tursoToken: settings.TURSO_TOKEN ?? '',
  mode: 'embedded',
  localDbPath: dbPath,
});

// Run migrations once at startup before serving any request
await migrate(db, {
  migrationsFolder: join(import.meta.dir, '../../../../adapters/outbound/turso/migrations'),
});

const auth = createAuth(db);

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function serveStatic(pathname: string): Promise<Response> {
  const decoded = decodeURIComponent(pathname.split('?')[0]).replace(/\0/g, '');
  const resolved = resolve(join(PUBLIC_DIR, decoded));
  const rel = relative(PUBLIC_DIR, resolved);
  if (rel.startsWith('..') || rel.startsWith('/')) {
    // Path traversal attempt — serve SPA shell instead
    return new Response(Bun.file(join(PUBLIC_DIR, 'index.html')));
  }
  const target = resolved === PUBLIC_DIR ? join(PUBLIC_DIR, 'index.html') : resolved;
  const file = Bun.file(target);
  if (await file.exists()) return new Response(file);
  return new Response(Bun.file(join(PUBLIC_DIR, 'index.html')));
}

Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method.toUpperCase();

    // Better Auth owns all /api/auth/* routes
    if (pathname.startsWith('/api/auth/')) {
      return auth.handler(req);
    }

    if (pathname.startsWith('/api/')) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) return unauthorized();

      const userId = session.user.id;
      const isOwner = session.user.email === OWNER_EMAIL;
      const c = await getCompositionForUser(db, userId, isOwner);

      if (method === 'GET' && pathname === '/api/today') {
        const todos = await c.todosUseCase.listOpen();
        return json({
          date: new Date().toISOString().slice(0, 10),
          todos,
        });
      }

      if (method === 'GET' && pathname === '/api/todos') {
        const todos = await c.todosUseCase.listOpen();
        return json(todos);
      }

      if (method === 'POST' && pathname === '/api/todos') {
        let body: TodoAddInputDto;
        try {
          body = await req.json() as TodoAddInputDto;
        } catch {
          return json({ error: 'Malformed JSON' }, 400);
        }
        const todo = await c.todosUseCase.add(body);
        return json(todo, 201);
      }

      const patchMatch = /^\/api\/todos\/([^/]+)$/.exec(pathname);
      if (method === 'PATCH' && patchMatch) {
        const id = patchMatch[1]!;
        let patch: TodoUpdatePatch;
        try {
          patch = await req.json() as TodoUpdatePatch;
        } catch {
          return json({ error: 'Malformed JSON' }, 400);
        }
        await c.todosUseCase.updateByIdOrIndex(id, patch);
        return json({ ok: true });
      }

      const completeMatch = /^\/api\/todos\/([^/]+)\/complete$/.exec(pathname);
      if (method === 'POST' && completeMatch) {
        const id = completeMatch[1]!;
        await c.todosUseCase.completeByIdOrIndex(id);
        return json({ ok: true });
      }

      return notFound();
    }

    return serveStatic(pathname);
  },
});

console.log(`Pax web server: http://localhost:${PORT}`);
