// TODO: wire this hook to views/pages/ApplicationDetail.jsx in Stage 3
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../../../context/AuthContext';

export interface Document {
  _id: string;
  name: string;
  url?: string;
  status: 'pending' | 'verified' | 'rejected' | 'needs_reupload';
  admin_note?: string;
  uploaded_at?: string;
}

export interface EmbassyAppointment {
  date?: string;
  time?: string;
  location?: string;
  fee?: number;
}

export interface ApplicationDetail {
  id: string;
  status: string;
  country_id: string;
  visa_type: string;
  primary_applicant?: { full_name: string; [key: string]: unknown };
  university_selections?: Array<{ university: { name: string; country: string }; status: string }>;
  documents?: Document[];
  form_data?: { visa_appointment?: EmbassyAppointment };
  rejection_reason?: string;
  visa_valid_from?: string;
  visa_valid_to?: string;
  created_at: string;
  [key: string]: unknown;
}

export function useApplicationViewModel(applicationId: string | undefined) {
  const { token } = useAuth();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [country, setCountry] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchApplication = useCallback(async () => {
    if (!applicationId || !token) return;
    setLoading(true);
    setLoadError(false);
    try {
      const r = await axios.get(`${API}/users/me/applications/${applicationId}`, { headers });
      setApplication(r.data);
      if (r.data?.country_id) {
        try {
          const cr = await axios.get(`${API}/countries/${r.data.country_id}`);
          setCountry(cr.data);
        } catch {
          // country data not critical
        }
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [applicationId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchApplication(); }, [fetchApplication]);

  const uploadDocument = useCallback(async (docId: string, file: File) => {
    if (!applicationId || !token) return;
    setUploadBusy(docId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await axios.post(
        `${API}/users/me/applications/${applicationId}/documents/${docId}/upload`,
        fd,
        { headers: { ...headers, 'Content-Type': 'multipart/form-data' } },
      );
      await fetchApplication();
    } finally {
      setUploadBusy(null);
    }
  }, [applicationId, token, fetchApplication]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAppointment = useCallback(async (appt: EmbassyAppointment) => {
    if (!applicationId || !token) return;
    setSubmitting(true);
    try {
      await axios.patch(
        `${API}/users/me/applications/${applicationId}`,
        { form_data: { visa_appointment: appt } },
        { headers },
      );
      await fetchApplication();
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, token, fetchApplication]); // eslint-disable-line react-hooks/exhaustive-deps

  const documents: Document[] = application?.documents ?? [];

  return {
    application,
    country,
    documents,
    loading,
    loadError,
    submitting,
    uploadBusy,
    uploadDocument,
    saveAppointment,
    refetch: fetchApplication,
  };
}
