import { useCallback, useEffect, useState } from 'react';
import { adminClient } from '../lib/admin';
import { useAdminAuth } from '../context/AdminAuthContext';

export interface UserProfileVM {
  data: any | null;
  loading: boolean;
  error: { status?: number; message: string } | null;
  busy: boolean;
  load: () => Promise<void>;
  sendReminder: (template: string, note: string | null) => Promise<void>;
  suspend: (reason: string) => Promise<void>;
  unsuspend: () => Promise<void>;
}

export function useUserProfileViewModel(userId: string): UserProfileVM {
  const { token } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await adminClient(token).get(`/users/${userId}/profile`);
      setData(r.data);
    } catch (e: any) {
      setError({ status: e?.response?.status, message: e?.response?.data?.detail || e.message });
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => { load(); }, [load]);

  const sendReminder = useCallback(async (template: string, note: string | null) => {
    setBusy(true);
    try {
      await adminClient(token).post(`/users/${userId}/send-reminder`, { template, note });
    } finally {
      setBusy(false);
    }
  }, [token, userId]);

  const suspend = useCallback(async (reason: string) => {
    setBusy(true);
    try {
      const r = await adminClient(token).post(`/users/${userId}/suspend`, { reason });
      setData((d: any) => ({ ...d, user: r.data }));
      await load();
    } finally {
      setBusy(false);
    }
  }, [token, userId, load]);

  const unsuspend = useCallback(async () => {
    setBusy(true);
    try {
      const r = await adminClient(token).post(`/users/${userId}/unsuspend`);
      setData((d: any) => ({ ...d, user: r.data }));
      await load();
    } finally {
      setBusy(false);
    }
  }, [token, userId, load]);

  return { data, loading, error, busy, load, sendReminder, suspend, unsuspend };
}
