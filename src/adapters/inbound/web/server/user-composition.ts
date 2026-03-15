import type { TursoDb } from '../../../../adapters/outbound/turso/client';
import type { Composition } from '../../../../composition';
import { composeForUser } from '../../../../composition';

const cache = new Map<string, Promise<Composition>>();

export function getCompositionForUser(
  db: TursoDb,
  userId: string,
  isOwner: boolean,
): Promise<Composition> {
  const cacheKey = `${userId}:${isOwner}`;
  let promise = cache.get(cacheKey);
  if (!promise) {
    promise = composeForUser(db, userId, isOwner).catch((err: unknown) => {
      cache.delete(cacheKey);
      throw err;
    });
    cache.set(cacheKey, promise);
  }
  return promise;
}
