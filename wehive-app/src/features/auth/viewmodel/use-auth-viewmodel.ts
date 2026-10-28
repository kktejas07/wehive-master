import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { api, ApiError } from '@/core/api/client';
import { tokenStore } from '@/core/auth/token-store';
import { useSession } from '@/core/auth/session';

import type { User } from '../model/auth-api';

interface EmailLoginResult { access_token: string; user: User; }

export function useLoginViewModel() {
  const qc = useQueryClient();
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api<EmailLoginResult>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await tokenStore.set(res.access_token);
      await session.signIn(res.access_token, res.user);
      qc.invalidateQueries();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return { login, loading, error };
}

export function useSignupViewModel() {
  const qc = useQueryClient();
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signup(name: string, email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api<EmailLoginResult>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      await tokenStore.set(res.access_token);
      await session.signIn(res.access_token, res.user);
      qc.invalidateQueries();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  }

  return { signup, loading, error };
}
