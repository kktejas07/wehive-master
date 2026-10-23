import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError } from '@/core/api/client';
import { tokenStore } from '@/core/auth/token-store';
import { authApi, type User } from '@/features/auth/model/auth-api';

interface Session {
  user: User | null;
  ready: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/** App-wide session: restores the saved token on launch and keeps the user fresh. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!(await tokenStore.get())) {
      setUser(null);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await tokenStore.clear();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await refresh();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const signIn = useCallback(async (token: string, u: User) => {
    await tokenStore.set(token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut, refresh }), [user, ready, signIn, signOut, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
