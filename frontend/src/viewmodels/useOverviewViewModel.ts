import { useEffect, useState, useCallback } from 'react';
import { adminClient, runAggregators as _runAgg } from '../lib/admin';
import { useAdminAuth } from '../context/AdminAuthContext';

export interface OverviewVM {
  metrics: any | null;
  alerts: any | null;
  funnel: any | null;
  monitoring: any | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  runAggregators: () => Promise<{ title: string; description?: string }>;
}

export function useOverviewViewModel(): OverviewVM {
  const { token } = useAdminAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [monitoring, setMonitoring] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const client = adminClient(token);
    Promise.all([
      client.get('/metrics'),
      client.get('/alerts'),
      client.get('/funnel', { params: { days: 90 } }),
      client.get('/monitoring/dashboard').catch(() => ({ data: null })),
    ]).then(([m, a, f, mo]) => {
      if (!live) return;
      setMetrics(m.data);
      setAlerts(a.data);
      setFunnel(f.data);
      setMonitoring(mo.data);
      setError(null);
    }).catch((e: any) => {
      if (!live) return;
      setError(e?.response?.data?.detail || e.message);
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [token, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const runAggregators = useCallback(() => _runAgg(token), [token]);

  return { metrics, alerts, funnel, monitoring, loading, error, refetch, runAggregators };
}
