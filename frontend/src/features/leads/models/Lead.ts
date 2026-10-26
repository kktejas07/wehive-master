export type LeadStatus = 'new' | 'contacted' | 'closed';
export type LeadPurpose = 'study' | 'work' | 'tourist' | 'business';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  destination: string;
  purpose: LeadPurpose;
  status: LeadStatus;
  message?: string;
  source?: string;
  travellers?: number;
  branch?: string;
  notes?: { text: string; by: string; at: string }[];
  created_at: string;
  updated_at?: string;
}
