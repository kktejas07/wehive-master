import type { Metadata } from 'expo-router/server';

import { EnquiryScreen } from '@/features/enquiry/view/enquiry-screen';

export function generateMetadata(): Metadata {
  return {
    title: 'Apply | WeHive',
    description: 'Start a visa, study abroad or immigration enquiry — our consultants respond within one business day.',
  };
}

export default EnquiryScreen;
