// TODO: wire this hook to views/pages/USVisaSlots.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../../../context/AuthContext';

export interface VisaSlot {
  id: string;
  consulate: string;
  visa_type: string;
  date: string;
  time?: string;
  available: boolean;
  reported_at?: string;
}

export interface SlotSummary {
  total: number;
  by_consulate: Record<string, number>;
  latest_date?: string;
}

export interface SlotFilters {
  country: string;
  visaTypes: string[];
  consulates: string[];
}

const DEFAULT_CONSULATES = ['NEW DELHI', 'MUMBAI', 'CHENNAI', 'KOLKATA', 'HYDERABAD'];

export function useUSVisaSlotsViewModel() {
  const { token, isAuthed } = useAuth();

  const [slots, setSlots] = useState<VisaSlot[]>([]);
  const [summary, setSummary] = useState<SlotSummary | null>(null);
  const [status, setStatus] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [filters, setFilters] = useState<SlotFilters>({
    country: 'usa',
    visaTypes: ['b1b2'],
    consulates: DEFAULT_CONSULATES,
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSlots = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const [summaryRes, statusRes, slotsRes] = await Promise.all([
        axios.get(`${API}/usvisa/slots/summary`, { params: { country: filters.country }, headers }),
        axios.get(`${API}/usvisa/status`),
        axios.get(`${API}/usvisa/slots`, { params: { limit: 50 }, headers }),
      ]);
      setSummary(summaryRes.data);
      setStatus(statusRes.data);
      setSlots(slotsRes.data?.items ?? slotsRes.data ?? []);
    } catch { /* slots are best-effort */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [filters.country, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const r = await axios.get(`${API}/usvisa/subscription`, { headers });
      setSubscribed(!!r.data?.active);
    } catch { setSubscribed(false); }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSlots(); checkSubscription(); }, [fetchSlots, checkSubscription]);

  const subscribe = useCallback(async (visaTypes: string[], consulates: string[]) => {
    if (!token) return;
    setSubscribing(true);
    try {
      await axios.post(`${API}/usvisa/subscribe`, { whatsapp: whatsappNumber, visa_types: visaTypes, consulates }, { headers });
      setSubscribed(true);
    } finally { setSubscribing(false); }
  }, [token, whatsappNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const unsubscribe = useCallback(async () => {
    if (!token) return;
    await axios.delete(`${API}/usvisa/subscription`, { headers });
    setSubscribed(false);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const reportSlot = useCallback(async (payload: Partial<VisaSlot>) => {
    setReportBusy(true);
    try {
      await axios.post(`${API}/usvisa/slots/report`, payload, { headers });
      await fetchSlots(true);
    } finally { setReportBusy(false); }
  }, [fetchSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    slots, summary, status,
    loading, refreshing, subscribing, subscribed,
    whatsappNumber, setWhatsappNumber,
    reportBusy,
    filters, setFilters,
    isAuthed,
    subscribe,
    unsubscribe,
    reportSlot,
    refresh: () => fetchSlots(true),
  };
}
