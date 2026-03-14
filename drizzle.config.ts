import type { Config } from 'drizzle-kit';

export default {
  schema: './src/adapters/outbound/turso/schema.ts',
  out: './src/adapters/outbound/turso/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_URL ?? 'file:./.dev.db',
    authToken: process.env.TURSO_TOKEN,
  },
} satisfies Config;
