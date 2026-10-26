// TODO: wire this hook to views/admin/ApplicationCase.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminClient } from '../lib/admin';

export interface CaseDocument {
  _id: string;
  name: string;
  url?: string;
  status: 'pending' | 'verified' | 'rejected' | 'needs_reupload';
  reason?: string;
  admin_note?: string;
}

export interface InternalNote {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

export interface CaseMessage {
  id: string;
  text: string;
  sender: 'admin' | 'user';
  created_at: string;
}

export interface ApplicationCase {
  id: string;
  status: string;
  applicant_name?: string;
  user_id: string;
  agent_id?: string;
  country?: string;
  visa_type?: string;
  documents?: CaseDocument[];
  internal_notes?: InternalNote[];
  messages?: CaseMessage[];
  timeline?: Array<{ event: string; at: string; by?: string }>;
  visa_valid_from?: string;
  visa_valid_to?: string;
  [key: string]: unknown;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  staff_role?: string;
}

export function useApplicationCaseViewModel(applicationId: string | undefined) {
  const { token, admin } = useAdminAuth();

  const [caseData, setCaseData] = useState<ApplicationCase | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'documents' | 'messages' | 'timeline' | 'status'>('overview');
  const [statusBusy, setStatusBusy] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!applicationId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [caseRes, staffRes] = await Promise.all([
        adminClient(token).get(`/applications/${applicationId}/case`),
        adminClient(token).get('/staff').catch(() => ({ data: [] })),
      ]);
      setCaseData(caseRes.data);
      setStaff(staffRes.data?.items ?? staffRes.data ?? []);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const message = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Could not load case';
      setError({ status, message });
    } finally {
      setLoading(false);
    }
  }, [applicationId, token]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const updateStatus = useCallback(async (status: string, note?: string, validFrom?: string, validTo?: string) => {
    if (!applicationId || !token) return;
    setStatusBusy(true);
    try {
      await adminClient(token).post(`/applications/${applicationId}/status`, {
        status, note: note || undefined,
        visa_valid_from: validFrom || undefined,
        visa_valid_to: validTo || undefined,
      });
      await fetchCase();
    } finally { setStatusBusy(false); }
  }, [applicationId, token, fetchCase]);

  const requestDocumentReupload = useCallback(async (docId: string, note: string) => {
    if (!applicationId || !token) return;
    await adminClient(token).post(`/applications/${applicationId}/documents/${docId}/request-reupload`, { note });
    await fetchCase();
  }, [applicationId, token, fetchCase]);

  const reviewDocument = useCallback(async (docId: string, status: 'verified' | 'rejected', reason?: string) => {
    if (!applicationId || !token) return;
    await adminClient(token).patch(`/applications/${applicationId}/documents/${docId}`, { status, ...(reason ? { reason } : {}) });
    await fetchCase();
  }, [applicationId, token, fetchCase]);

  const addNote = useCallback(async (text: string) => {
    if (!applicationId || !token) return;
    const { data } = await adminClient(token).post(`/applications/${applicationId}/internal-notes`, { text });
    await fetchCase();
    return data;
  }, [applicationId, token, fetchCase]);

  const sendMessage = useCallback(async (text: string) => {
    if (!applicationId || !token) return;
    const { data } = await adminClient(token).post(`/applications/${applicationId}/messages`, { text });
    await fetchCase();
    return data;
  }, [applicationId, token, fetchCase]);

  const assignAgent = useCallback(async (agentId: string) => {
    if (!applicationId || !token) return;
    setAssignBusy(true);
    try {
      await adminClient(token).patch(`/applications/${applicationId}/assign`, { agent_id: agentId });
      await fetchCase();
    } finally { setAssignBusy(false); }
  }, [applicationId, token, fetchCase]);

  const documents: CaseDocument[] = caseData?.documents ?? [];
  const notes: InternalNote[] = caseData?.internal_notes ?? [];
  const messages: CaseMessage[] = caseData?.messages ?? [];

  return {
    caseData,
    staff,
    admin,
    documents,
    notes,
    messages,
    loading,
    error,
    tab, setTab,
    statusBusy,
    assignBusy,
    updateStatus,
    requestDocumentReupload,
    reviewDocument,
    addNote,
    sendMessage,
    assignAgent,
    refetch: fetchCase,
  };
}
