import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { contactApi, type ContactForm } from '../model/contact-api';

const EMPTY: ContactForm = { name: '', email: '', phone: '', subject: '', message: '' };

export function useContact() {
  const [form, setForm] = useState<ContactForm>({ ...EMPTY });

  const mutation = useMutation({
    mutationFn: () => contactApi.submit(form),
    onSuccess: () => setForm({ ...EMPTY }),
  });

  const set = <K extends keyof ContactForm>(k: K, v: ContactForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const ready =
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    !!form.subject &&
    form.message.trim().length >= 5;

  return {
    form,
    set,
    ready,
    busy: mutation.isPending,
    sent: mutation.isSuccess,
    error: mutation.error?.message ?? null,
    submit: mutation.mutate,
    reset: mutation.reset,
  };
}
