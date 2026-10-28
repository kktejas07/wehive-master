export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  application_id: string;
  amount_inr: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  invoice_url?: string;
  created_at: string;
  paid_at?: string;
}

export interface PaymentsPage {
  items: Payment[];
  total: number;
  page: number;
  per_page: number;
}
