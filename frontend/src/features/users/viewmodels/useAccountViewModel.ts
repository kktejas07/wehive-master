// TODO: wire this hook to views/pages/Account.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../../../context/AuthContext';

export interface Application {
  id: string;
  status: string;
  country_id: string;
  visa_type: string;
  created_at: string;
  university_selections?: Array<{ university: { name: string; country: string } }>;
  [key: string]: unknown;
}

export interface ReferralCode {
  code: string;
  referrals: number;
  credits: number;
}

export interface ReferralStats {
  total_referrals: number;
  total_credits: number;
  pending_credits: number;
}

export type AccountTab = 'applications' | 'saved' | 'referrals' | 'profile' | 'settings';

export function useAccountViewModel() {
  const { user, token, isAuthed, loading: authLoading, refreshUser } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [savedPlans, setSavedPlans] = useState<unknown[]>([]);
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>('applications');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScholarshipOnly, setShowScholarshipOnly] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await axios.get(`${API}/users/me/applications`, { headers });
      setApplications(r.data?.items ?? r.data ?? []);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSavedPlans = useCallback(async () => {
    if (!token) return;
    try {
      const r = await axios.get(`${API}/users/me/saved-plans`, { headers });
      setSavedPlans(r.data?.items ?? r.data ?? []);
    } catch {
      setSavedPlans([]);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReferral = useCallback(async () => {
    if (!token) return;
    try {
      const [codeRes, statsRes] = await Promise.allSettled([
        axios.get(`${API}/referrals/my-code`, { headers }),
        axios.get(`${API}/referrals/stats`, { headers }),
      ]);
      if (codeRes.status === 'fulfilled') setReferralCode(codeRes.value.data);
      if (statsRes.status === 'fulfilled') setReferralStats(statsRes.value.data);
    } catch {
      // referral not critical
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthed) return;
    fetchApplications();
    fetchSavedPlans();
    fetchReferral();
  }, [isAuthed, fetchApplications, fetchSavedPlans, fetchReferral]);

  const filteredApplications = showScholarshipOnly
    ? applications.filter((a) => (a as { scholarship_available?: boolean }).scholarship_available)
    : applications;

  return {
    user,
    isAuthed,
    authLoading,
    refreshUser,
    applications: filteredApplications,
    allApplications: applications,
    savedPlans,
    referralCode,
    referralStats,
    activeTab,
    setActiveTab,
    loading,
    error,
    showScholarshipOnly,
    setShowScholarshipOnly,
    refetchApplications: fetchApplications,
    refetchReferral: fetchReferral,
  };
}
