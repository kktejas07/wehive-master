import { api } from '@/core/api/client';
import type { ConsultationForm } from './types';

export async function submitConsultation(form: ConsultationForm): Promise<void> {
  await api('/leads/enquiry', {
    method: 'POST',
    body: {
      name: form.name,
      email: form.email,
      phone: form.phone,
      destination: form.destination,
      purpose: form.purpose || 'other',
      message: form.message.trim() || null,
      travellers: 1,
      travel_date: null,
      source: 'mobile-consultation',
    },
  });
}
