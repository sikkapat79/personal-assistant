import type { TursoDb } from '../../../../adapters/outbound/turso/client';
import type { Composition } from '../../../../composition';
import { composeForUser } from '../../../../composition';

const cache = new Map<string, Promise<Composition>>();

export function getCompositionForUser(
  db: TursoDb,
  userId: string,
  isOwner: boolean,
): Promise<Composition> {
  let promise = cache.get(userId);
  if (!promise) {
    promise = composeForUser(db, userId, isOwner);
    cache.set(userId, promise);
  }
  return promise;
}
