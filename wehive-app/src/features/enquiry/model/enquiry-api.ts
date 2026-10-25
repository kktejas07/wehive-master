import { api } from '@/core/api/client';
import type { EnquiryForm } from './types';

export async function submitEnquiry(form: EnquiryForm): Promise<void> {
  await api('/leads/enquiry', {
    method: 'POST',
    body: {
      ...form,
      travel_date: form.travel_date || null,
      travellers: Number(form.travellers) || 1,
      message: form.message.trim() || null,
      source: 'mobile',
    },
  });
}
