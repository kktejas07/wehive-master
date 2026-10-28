import { useState } from 'react';
import { submitEnquiry } from '../model/enquiry-api';
import { EMPTY_FORM, type EnquiryForm, type EnquiryPurpose, GROUP_PROMO_PURPOSES } from '../model/types';

export function useEnquiry() {
  const [form, setForm] = useState<EnquiryForm>({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null); // first name after submit
  const [error, setError] = useState('');

  const set = <K extends keyof EnquiryForm>(k: K, v: EnquiryForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const groupPromo = GROUP_PROMO_PURPOSES.has(form.purpose as EnquiryPurpose) && form.travellers >= 3;
  const workPromo  = form.purpose === 'work' && form.travellers >= 2;
  const showPromo  = groupPromo || workPromo;

  const promoText = groupPromo
    ? `Group of ${form.travellers} travelers? Each qualifies for a free sticker visa service — worth ₹9,000 per person.`
    : `Travelling with dependents? H-1B + H-4 or H-4 + H-3 groups each receive a free sticker visa service — worth ₹9,000 per person.`;

  const ready =
    !!form.purpose &&
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    form.phone.replace(/\D/g, '').length >= 7 &&
    form.destination.trim().length >= 2;

  const submit = async () => {
    if (!ready) { setError('Please fill in all required fields.'); return; }
    setBusy(true); setError('');
    try {
      await submitEnquiry(form);
      setSent(form.name.trim().split(' ')[0] || 'there');
      setForm({ ...EMPTY_FORM });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setSent(null); setError(''); };

  return { form, set, busy, sent, error, ready, showPromo, promoText, submit, reset };
}
