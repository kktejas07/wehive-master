export type EnquiryPurpose =
  | 'tourist' | 'business' | 'student_f1' | 'work'
  | 'family' | 'immigration' | 'transit' | 'other';

export interface EnquiryForm {
  purpose: EnquiryPurpose | '';
  name: string;
  email: string;
  phone: string;
  destination: string;
  travel_date: string;
  travellers: number;
  message: string;
}

export const EMPTY_FORM: EnquiryForm = {
  purpose: '', name: '', email: '', phone: '',
  destination: '', travel_date: '', travellers: 1, message: '',
};

export const PURPOSES: { id: EnquiryPurpose; label: string; hint: string }[] = [
  { id: 'tourist',    label: 'Tourist',     hint: 'Holiday or visit' },
  { id: 'business',   label: 'Business',    hint: 'Meetings, conferences' },
  { id: 'student_f1', label: 'Student',     hint: 'Study abroad' },
  { id: 'work',       label: 'Work',        hint: 'Job or work permit' },
  { id: 'family',     label: 'Family',      hint: 'Spouse, parents' },
  { id: 'immigration',label: 'Immigration', hint: 'EB1A · EB5 · PR' },
  { id: 'transit',    label: 'Transit',     hint: 'Passing through' },
  { id: 'other',      label: 'Other',       hint: 'Tell us below' },
];

export const GROUP_PROMO_PURPOSES = new Set<EnquiryPurpose>(['tourist', 'business', 'family']);
