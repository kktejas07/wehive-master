export interface ConsultationForm {
  name: string;
  email: string;
  phone: string;
  destination: string;
  purpose: string;
  message: string;
}

export const EMPTY_FORM: ConsultationForm = {
  name: '', email: '', phone: '', destination: '', purpose: '', message: '',
};

export const PURPOSES = [
  { id: 'student', label: 'Study Abroad' },
  { id: 'tourist', label: 'Tourist Visa' },
  { id: 'work', label: 'Work Visa' },
  { id: 'immigration', label: 'Immigration / PR' },
  { id: 'family', label: 'Family Visa' },
  { id: 'other', label: 'Other' },
] as const;

export interface Branch {
  id: string;
  city: string;
  address: string | null;
  isNew?: boolean;
}

export const BRANCHES: Branch[] = [
  { id: 'hyd', city: 'Hyderabad', address: '2nd Floor, Banjara Hills Rd No. 2, Hyderabad 500034' },
  { id: 'blr', city: 'Bangalore', address: null, isNew: true },
  { id: 'del', city: 'Delhi NCR', address: null, isNew: true },
];
