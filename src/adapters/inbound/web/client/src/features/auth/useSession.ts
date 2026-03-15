import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { SessionUser } from '@/lib/api-client';

export interface UseSessionResult {
  loading: boolean;
  user: SessionUser | null;
}

export function useSession(): UseSessionResult {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    apiClient
      .getSession()
      .then((data) => setUser(data?.user ?? null))
      .catch((err: unknown) => {
        console.error('[auth] Session fetch failed:', err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { loading, user };
}
