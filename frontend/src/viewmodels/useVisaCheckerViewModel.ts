// TODO: wire this hook to views/pages/VisaChecker.jsx in Stage 3
import { useState, useCallback } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';

export interface VisaCheckForm {
  nationality: string;
  destination: string;
  travelDate: string;
}

export interface VisaCheckResult {
  visa_required: boolean;
  visa_on_arrival?: boolean;
  evisa_available?: boolean;
  visa_free?: boolean;
  max_stay_days?: number;
  requirements?: string[];
  processing_time?: string;
  fee_usd?: number;
  notes?: string;
  source?: string;
  [key: string]: unknown;
}

const BLANK_FORM: VisaCheckForm = {
  nationality: 'in',
  destination: '',
  travelDate: '',
};

export function useVisaCheckerViewModel() {
  const [form, setFormState] = useState<VisaCheckForm>(BLANK_FORM);
  const [result, setResult] = useState<VisaCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const setField = useCallback(<K extends keyof VisaCheckForm>(key: K, value: VisaCheckForm[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setResult(null);
    setError('');
  }, []);

  const checkVisa = useCallback(async () => {
    if (!form.destination) { setError('Please select a destination country'); return; }
    setLoading(true);
    setError('');
    setIsFallback(false);
    try {
      const r = await axios.post(`${API}/visa-providers/sherpa/trips`, {
        nationality: form.nationality,
        destination: form.destination,
        departure_date: form.travelDate || undefined,
      });
      setResult(r.data);
    } catch {
      // Fall back to our own country data
      try {
        const c = await axios.get(`${API}/countries/${encodeURIComponent(form.destination.toLowerCase())}`);
        setResult(c.data?.visa_info ?? c.data ?? null);
        setIsFallback(true);
      } catch {
        setError('Could not retrieve visa information. Please try again.');
        setResult(null);
      }
    } finally {
      setLoading(false);
    }
  }, [form]);

  const resetForm = useCallback(() => {
    setFormState(BLANK_FORM);
    setResult(null);
    setError('');
    setIsFallback(false);
  }, []);

  return {
    form,
    setField,
    result,
    loading,
    error,
    isFallback,
    checkVisa,
    resetForm,
  };
}
