// TODO: wire this hook to views/pages/AgentPortal.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';

const AGENT_TOKEN_KEY = 'agent_token';

export interface AgentStudent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  [key: string]: unknown;
}

export interface AgentApplication {
  id: string;
  status: string;
  student_id: string;
  country?: string;
  visa_type?: string;
  [key: string]: unknown;
}

export interface AgentStats {
  total_students: number;
  active_cases: number;
  commission_pending: number;
  [key: string]: unknown;
}

export function useAgentPortalViewModel() {
  const [token] = useState<string | null>(() => localStorage.getItem(AGENT_TOKEN_KEY));
  const [agent, setAgent] = useState<{ name: string; email: string; [key: string]: unknown } | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [students, setStudents] = useState<AgentStudent[]>([]);
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [selectedCase, setSelectedCase] = useState<AgentApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchDashboard = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const [settingsRes, dashRes] = await Promise.all([
        axios.get(`${API}/agent/settings`, { headers }),
        axios.get(`${API}/agent/dashboard`, { headers }),
      ]);
      setAgent(settingsRes.data);
      setStats(dashRes.data);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Could not load portal');
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    try {
      const r = await axios.get(`${API}/agent/students`, { headers });
      setStudents(r.data?.items ?? r.data ?? []);
    } catch { setStudents([]); }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    try {
      const r = await axios.get(`${API}/agent/applications`, { headers });
      setApplications(r.data?.items ?? r.data ?? []);
    } catch { setApplications([]); }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDashboard();
    fetchStudents();
    fetchApplications();
  }, [fetchDashboard, fetchStudents, fetchApplications]);

  const selectCase = useCallback((app: AgentApplication | null) => {
    setSelectedCase(app);
  }, []);

  const updateCaseStatus = useCallback(async (caseId: string, status: string, note?: string) => {
    if (!token) return;
    await axios.patch(`${API}/agent/applications/${caseId}`, { status, note }, { headers });
    await fetchApplications();
  }, [token, fetchApplications]); // eslint-disable-line react-hooks/exhaustive-deps

  const addStudent = useCallback(async (payload: Partial<AgentStudent>) => {
    if (!token) return;
    await axios.post(`${API}/agent/students`, payload, { headers });
    await fetchStudents();
  }, [token, fetchStudents]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    token,
    agent,
    stats,
    students,
    applications,
    selectedCase,
    loading,
    error,
    selectCase,
    updateCaseStatus,
    addStudent,
    refetch: fetchDashboard,
  };
}
