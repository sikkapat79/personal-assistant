import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

export function createTursoDb(opts: {
  tursoUrl: string;
  tursoToken: string;
  mode: 'embedded' | 'remote';
  /** Required when mode is 'embedded'. Path to the local SQLite replica file. */
  localDbPath?: string;
}) {
  if (!opts.tursoUrl?.trim()) {
    throw new Error('createTursoDb: tursoUrl is required and must not be empty');
  }
  if (!opts.tursoToken?.trim()) {
    throw new Error('createTursoDb: tursoToken is required and must not be empty');
  }
  if (opts.mode === 'embedded' && !opts.localDbPath) {
    throw new Error('createTursoDb: localDbPath is required for embedded mode');
  }

  const client =
    opts.mode === 'embedded'
      ? createClient({
          url: `file:${opts.localDbPath}`,
          syncUrl: opts.tursoUrl,
          authToken: opts.tursoToken,
        })
      : createClient({ url: opts.tursoUrl, authToken: opts.tursoToken });

  return drizzle(client, { schema });
}

export type TursoDb = ReturnType<typeof createTursoDb>;
