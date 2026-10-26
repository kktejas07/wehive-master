// TODO: wire this hook to views/pages/ApplicantFlow.jsx in Stage 3
import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API } from '../context/AuthContext';

export type FlowStep = 1 | 2 | 3 | 4 | 5;

export interface ApplicantProfile {
  full_name?: string;
  dob?: string;
  nationality?: string;
  passport_number?: string;
  phone?: string;
  email?: string;
  education_level?: string;
  [key: string]: unknown;
}

export interface FlowFormData {
  category: string;
  subVisa: string;
  profile: ApplicantProfile;
  checkedDocs: Set<string>;
  customDocs: string[];
  helpNeeded: Set<string>;
  applicant: ApplicantProfile;
}

export function useApplicantFlowViewModel() {
  const { token } = useAuth();

  const [step, setStep] = useState<FlowStep>(1);
  const [category, setCategory] = useState('');
  const [subVisa, setSubVisa] = useState('');
  const [profile, setProfile] = useState<ApplicantProfile>({});
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [customDocs, setCustomDocs] = useState<string[]>([]);
  const [helpNeeded, setHelpNeeded] = useState<Set<string>>(new Set());
  const [applicant, setApplicant] = useState<ApplicantProfile>({
    full_name: '', dob: '', nationality: 'Indian', passport_number: '', phone: '', email: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && !category) errs.category = 'Please select a visa category';
    if (step === 3 && !applicant.full_name) errs.full_name = 'Full name is required';
    if (step === 3 && !applicant.phone) errs.phone = 'Phone is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [step, category, applicant]);

  const nextStep = useCallback(() => {
    if (!validate()) return;
    setStep((s) => Math.min(5, s + 1) as FlowStep);
  }, [validate]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as FlowStep);
  }, []);

  const setField = useCallback(<K extends keyof ApplicantProfile>(key: K, value: ApplicantProfile[K]) => {
    setApplicant((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key as string]; return n; });
  }, []);

  const submitApplication = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await axios.post(
        `${API}/enquiries`,
        {
          category,
          sub_visa: subVisa,
          profile,
          docs_checked: [...checkedDocs],
          docs_custom: customDocs,
          help_needed: [...helpNeeded],
          applicant,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      setSubmitted(true);
    } catch (e: unknown) {
      setErrors({ submit: (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Submission failed' });
    } finally {
      setLoading(false);
    }
  }, [token, category, subVisa, profile, checkedDocs, customDocs, helpNeeded, applicant, validate]);

  const formData: FlowFormData = { category, subVisa, profile, checkedDocs, customDocs, helpNeeded, applicant };

  return {
    step,
    formData,
    category, setCategory,
    subVisa, setSubVisa,
    profile, setProfile,
    checkedDocs, setCheckedDocs,
    customDocs, setCustomDocs,
    helpNeeded, setHelpNeeded,
    applicant, setField,
    submitted,
    loading,
    errors,
    nextStep,
    prevStep,
    submitApplication,
  };
}
