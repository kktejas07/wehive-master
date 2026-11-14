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
    // Each panel loads on its own: one failing endpoint must not blank the whole overview.
    let metricsError: string | null = null;
    const soft = (req: Promise<any>) => req.then((r) => r.data).catch(() => null);
    Promise.all([
      client.get('/metrics').then((r: any) => r.data)
        .catch((e: any) => { metricsError = e?.response?.data?.detail || e.message; return {}; }),
      soft(client.get('/alerts')),
      soft(client.get('/funnel', { params: { days: 90 } })),
      soft(client.get('/monitoring/dashboard')),
    ]).then(([m, a, f, mo]) => {
      if (!live) return;
      setMetrics(m);
      setAlerts(a);
      setFunnel(f);
      setMonitoring(mo);
      // Only a page with nothing to show is an error.
      setError(metricsError && !a && !f ? metricsError : null);
      setLoading(false);
    });
    return () => { live = false; };
  }, [token, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const runAggregators = useCallback(() => _runAgg(token), [token]);

  return { metrics, alerts, funnel, monitoring, loading, error, refetch, runAggregators };
}
