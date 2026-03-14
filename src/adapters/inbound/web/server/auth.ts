import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth, line } from 'better-auth/plugins/generic-oauth';
import { eq, isNull } from 'drizzle-orm';
import type { TursoDb } from '../../../../adapters/outbound/turso/client';
import { events, snapshotTodos, snapshotLogs, entityIdMap, invites } from '../../../../adapters/outbound/turso/schema';

export function createAuth(db: TursoDb) {
  const ownerEmail = process.env.OWNER_EMAIL ?? '';
  const secret = process.env.BETTER_AUTH_SECRET ?? '';
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required');
  if (!ownerEmail) throw new Error('OWNER_EMAIL is required');

  return betterAuth({
    secret,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
    plugins: [
      genericOAuth({
        config: [
          line({
            clientId: process.env.LINE_CLIENT_ID ?? '',
            clientSecret: process.env.LINE_CLIENT_SECRET ?? '',
          }),
        ],
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Allow owner unconditionally; everyone else must be in the invites table
            if (user.email !== ownerEmail) {
              const [invite] = await db
                .select()
                .from(invites)
                .where(eq(invites.email, user.email))
                .limit(1);
              if (!invite) {
                throw new Error('not_invited');
              }
            }
            return { data: user };
          },
          after: async (user) => {
            // Owner first login: backfill all legacy rows that have no user_id
            if (user.email === ownerEmail) {
              try {
                await db.update(events).set({ userId: user.id }).where(isNull(events.userId));
                await db.update(snapshotTodos).set({ userId: user.id }).where(isNull(snapshotTodos.userId));
                await db.update(snapshotLogs).set({ userId: user.id }).where(isNull(snapshotLogs.userId));
                await db.update(entityIdMap).set({ userId: user.id }).where(isNull(entityIdMap.userId));
              } catch (err) {
                console.error(
                  '[auth] CRITICAL: Owner data backfill failed —',
                  err instanceof Error ? err.message : String(err)
                );
              }
            }
          },
        },
      },
    },
    trustedOrigins: [process.env.BETTER_AUTH_TRUSTED_ORIGIN ?? 'http://localhost:5173'],
  });
}

export type Auth = ReturnType<typeof createAuth>;
