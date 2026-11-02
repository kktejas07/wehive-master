import { useState } from 'react';

import { submitConsultation } from '../model/consultation-api';
import { EMPTY_FORM, type ConsultationForm } from '../model/types';

export function useConsultation() {
  const [form, setForm] = useState<ConsultationForm>({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState('');

  const set = <K extends keyof ConsultationForm>(k: K, v: ConsultationForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const ready =
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    form.phone.replace(/\D/g, '').length >= 7 &&
    form.destination.trim().length >= 2;

  const submit = async () => {
    if (!ready) { setError('Please fill in all required fields.'); return; }
    setBusy(true); setError('');
    try {
      await submitConsultation(form);
      setSent(form.name.trim().split(' ')[0] || 'there');
      setForm({ ...EMPTY_FORM });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setSent(null); setError(''); };

  return { form, set, busy, sent, error, ready, submit, reset };
}
