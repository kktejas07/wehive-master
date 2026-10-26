import type { Metadata } from 'expo-router/server';

import { PaymentsScreen } from '@/features/payments/view/payments-screen';

export function generateMetadata(): Metadata {
  return { title: 'Payments | WeHive', description: 'Your payment history and invoices.' };
}

export default PaymentsScreen;
