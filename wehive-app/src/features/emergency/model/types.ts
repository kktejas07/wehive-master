export interface EmergencyService {
  title: string;
  description: string;
  covered: boolean;
}

export const COVERED_SITUATIONS: EmergencyService[] = [
  { title: 'Medical Emergencies', description: 'Urgent treatment or care for an ailing family member.', covered: true },
  { title: 'Family Emergencies', description: 'Sudden bereavement or critical family crises.', covered: true },
  { title: 'Work Related Urgencies', description: 'Mission-critical deadlines and unforeseen business travel.', covered: true },
  { title: 'Time Sensitive Situations', description: 'Essential life events where the standard process has stalled.', covered: true },
];

export const NOT_COVERED_SITUATIONS: EmergencyService[] = [
  { title: 'Routine Travel', description: 'Standard tourism or leisure trips planned weeks in advance.', covered: false },
  { title: 'General Inquiries', description: 'Questions about visa rules or document checklists for future trips.', covered: false },
  { title: 'Standard Tracking', description: 'Status updates for applications made through the standard process.', covered: false },
  { title: 'Non-Urgent Changes', description: 'Minor edits or updates to existing routine visas.', covered: false },
];

export interface FAQ {
  question: string;
  answer: string;
}

export const EMERGENCY_FAQS: FAQ[] = [
  { question: 'What is the WeHive Emergency Helpline?', answer: 'A dedicated line for travellers facing time-sensitive, exceptional visa situations. It is designed for moments when you have an urgent or imminent travel need that cannot wait for standard support channels.' },
  { question: 'When should I call?', answer: 'When you have an urgent travel need -- a medical emergency, family crisis, last-minute business trip, or any situation where standard processing timelines will not work.' },
  { question: 'How quickly will you respond?', answer: 'Our team typically responds within minutes during business hours. For after-hours emergencies, leave a message and we will call back within 30 minutes.' },
  { question: 'Is there a fee?', answer: 'The helpline call itself is free. Visa processing fees still apply based on the country and visa type.' },
  { question: 'What should I have ready?', answer: 'Your passport details, destination country, travel dates, a brief description of your emergency, and any existing application reference numbers.' },
];

export const EMERGENCY_STATS = [
  { value: '250+', label: 'Countries Supported' },
  { value: '50+', label: 'Government Partners' },
  { value: '24/7', label: 'Active Call Support' },
];
