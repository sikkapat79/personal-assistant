import type { TodoAddInputDto } from '@app/todo/todo-dto';
import type { TodoUpdatePatch } from '@app/todo/todo-update-patch';
import { join, resolve, relative } from 'path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { Elysia } from 'elysia';
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

new Elysia()
  // Better Auth owns all /api/auth/* routes
  .all('/api/auth/*', ({ request }) => auth.handler(request))

  // Protected API routes — session guard + composition derive
  .group('/api', (api) =>
    api.guard(
      {
        beforeHandle: async ({ request }) => {
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session)
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
        },
      },
      (guarded) =>
        guarded
          // resolve runs after beforeHandle — session is guaranteed valid here
          .resolve(async ({ request }) => {
            const session = (await auth.api.getSession({ headers: request.headers }))!;
            const { id: userId, email } = session.user;
            const isOwner = email === OWNER_EMAIL;
            const c = await getCompositionForUser(db, userId, isOwner);
            return { c };
          })
          .get('/today', async ({ c }) => ({
            date: new Date().toISOString().slice(0, 10),
            todos: await c.todosUseCase.listOpen(),
          }))
          .get('/todos', ({ c }) => c.todosUseCase.listOpen())
          .post('/todos', async ({ c, body }) => {
            const todo = await c.todosUseCase.add(body as TodoAddInputDto);
            return new Response(JSON.stringify(todo), {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            });
          })
          .patch('/todos/:id', async ({ c, params, body }) => {
            await c.todosUseCase.updateByIdOrIndex(params.id, body as TodoUpdatePatch);
            return { ok: true };
          })
          .post('/todos/:id/complete', async ({ c, params }) => {
            await c.todosUseCase.completeByIdOrIndex(params.id);
            return { ok: true };
          })
    )
  )

  // SPA fallback — static files and index.html
  .all('/*', ({ request }) => serveStatic(new URL(request.url).pathname))

  .listen(PORT, () => console.log(`Pax web server: http://localhost:${PORT}`));
