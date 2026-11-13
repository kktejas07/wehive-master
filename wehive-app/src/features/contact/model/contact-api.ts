import { api } from '@/core/api/client';

import type { ContactForm, ContactResponse } from './types';

export type * from './types';

export const SUBJECTS = [
  { id: 'general', label: 'General inquiry' },
  { id: 'visa', label: 'Visa consultation' },
  { id: 'application', label: 'Application support' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'complaint', label: 'Complaint' },
  { id: 'partnership', label: 'Partnership opportunity' },
] as const;

export const contactApi = {
  submit: (form: ContactForm) =>
    api<ContactResponse>('/enquiry/contact', {
      method: 'POST',
      body: form,
    }),
};
