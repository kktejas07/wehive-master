// Wehive — content tailored to wehive.co.in (Ballari, India)
// Real brand info pulled from https://wehive.co.in

export const BRAND = {
  name: 'We Hive',
  tagline: 'Your Global Journey Starts Here',
  logo: '/brand/wehive-logo.png',
  logoWhite: '/brand/wehive-logo.png',
  phone: '+91 91132 56726',
  phoneRaw: '+919113256726',
  email: 'info@wehive.co.in',
  address: 'Shanti Plaza, 1st floor, Moka Road, Gandhi Nagar, Ballari',
  hours: 'Mon – Sat · 09:00 – 18:00 IST',
};

export const COUNTRIES = [
  {
    id: 'us',
    name: 'United States',
    flag: '\u{1F1FA}\u{1F1F8}',
    type: 'B1/B2',
    valid: '10 YEARS',
    fees: '$185',
    image:
      'https://images.unsplash.com/photo-1611596825222-dba035a86416?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '21 May 2025, 9:24 AM',
    processing: '4–6 weeks',
    popular: true,
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    flag: '\u{1F1EC}\u{1F1E7}',
    type: 'STANDARD',
    valid: '6 MONTHS',
    fees: '$140',
    image:
      'https://images.unsplash.com/photo-1665573456818-67a4c48110c0?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '8 May 2025, 9:54 AM',
    processing: '15 working days',
    popular: true,
  },
  {
    id: 'jp',
    name: 'Japan',
    flag: '\u{1F1EF}\u{1F1F5}',
    type: 'E-VISA',
    valid: '90 DAYS',
    fees: '$45',
    image:
      'https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '12 May 2025, 9:22 AM',
    processing: '5–7 days',
    popular: true,
  },
  {
    id: 'fr',
    name: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    type: 'SCHENGEN',
    valid: '90 DAYS',
    fees: '$95',
    image:
      'https://images.unsplash.com/photo-1570097703229-b195d6dd291f?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '15 May 2025, 9:47 AM',
    processing: '10–15 days',
    popular: true,
  },
  {
    id: 'sg',
    name: 'Singapore',
    flag: '\u{1F1F8}\u{1F1EC}',
    type: 'E-VISA',
    valid: '63 DAYS',
    fees: '$30',
    image:
      'https://images.unsplash.com/photo-1533281808624-e9b07b4294ff?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '29 Apr 2025, 9:52 AM',
    processing: '3–5 days',
    popular: false,
  },
  {
    id: 'ae',
    name: 'United Arab Emirates',
    flag: '\u{1F1E6}\u{1F1EA}',
    type: 'E-VISA',
    valid: '60 DAYS',
    fees: '$80',
    image:
      'https://images.unsplash.com/photo-1677632227671-cc52e6f7f130?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '13 May 2025, 9:39 AM',
    processing: '2–4 days',
    popular: true,
  },
  {
    id: 'au',
    name: 'Australia',
    flag: '\u{1F1E6}\u{1F1FA}',
    type: 'E-VISA',
    valid: '12 MONTHS',
    fees: '$160',
    image:
      'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '3 May 2025, 9:48 AM',
    processing: '7–10 days',
    popular: false,
  },
  {
    id: 'ca',
    name: 'Canada',
    flag: '\u{1F1E8}\u{1F1E6}',
    type: 'eTA',
    valid: '5 YEARS',
    fees: '$120',
    image:
      'https://images.unsplash.com/photo-1643104897073-bfa97947c94f?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '18 May 2025, 9:12 AM',
    processing: '14 days',
    popular: false,
  },
  {
    id: 'it',
    name: 'Italy',
    flag: '\u{1F1EE}\u{1F1F9}',
    type: 'SCHENGEN',
    valid: '90 DAYS',
    fees: '$95',
    image:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '11 May 2025, 8:30 AM',
    processing: '10–15 days',
    popular: false,
  },
  {
    id: 'ch',
    name: 'Switzerland',
    flag: '\u{1F1E8}\u{1F1ED}',
    type: 'SCHENGEN',
    valid: '90 DAYS',
    fees: '$95',
    image:
      'https://images.pexels.com/photos/29386884/pexels-photo-29386884.jpeg?auto=compress&cs=tinysrgb&w=940',
    eta: '20 May 2025, 11:00 AM',
    processing: '10–15 days',
    popular: false,
  },
  {
    id: 'th',
    name: 'Thailand',
    flag: '\u{1F1F9}\u{1F1ED}',
    type: 'E-VISA',
    valid: '60 DAYS',
    fees: '$40',
    image:
      'https://images.pexels.com/photos/35073656/pexels-photo-35073656.jpeg?auto=compress&cs=tinysrgb&w=940',
    eta: '6 May 2025, 7:50 AM',
    processing: '5 days',
    popular: true,
  },
  {
    id: 'de',
    name: 'Germany',
    flag: '\u{1F1E9}\u{1F1EA}',
    type: 'SCHENGEN',
    valid: '90 DAYS',
    fees: '$95',
    image:
      'https://images.unsplash.com/photo-1557067175-db3159d938ac?crop=entropy&cs=srgb&fm=jpg&q=80&w=900',
    eta: '14 May 2025, 10:10 AM',
    processing: '10–15 days',
    popular: false,
  },
];

export const STATS = [
  { id: 'visas', value: '12K+', label: 'Visas processed' },
  { id: 'countries', value: '60+', label: 'Countries supported' },
  { id: 'approval', value: '98.6%', label: 'Approval rate' },
  { id: 'rating', value: '4.9 / 5', label: 'Customer rating' },
];

export const STEPS = [
  {
    id: 1,
    title: 'Talk to a counsellor',
    desc: 'Walk in to our Ballari office or call us. We map your goal — work, study, immigration — to the right visa.',
  },
  {
    id: 2,
    title: 'We prepare every paper',
    desc: 'Documentation, mock interview, embassy appointment — we run the full file so nothing gets rejected on a technicality.',
  },
  {
    id: 3,
    title: 'Travel with confidence',
    desc: 'From airport assistance to post-arrival support, We Hive stays with you long after the visa stamp.',
  },
];

// Real services from wehive.co.in
export const SERVICES = [
  { id: 'visa-cat', icon: 'Compass', title: 'Visa Category Guidance', desc: 'Pick the right visa for your goal — work, study, tourist or family.' },
  { id: 'embassy', icon: 'Building2', title: 'Embassy Support', desc: 'Direct liaison with embassies and consulates for fast, accurate filings.' },
  { id: 'docs', icon: 'FileCheck2', title: 'Documentation Support', desc: 'Every form, affidavit and translation reviewed before it leaves your hands.' },
  { id: 'legal', icon: 'Scale', title: 'Legal Assistance', desc: 'Licensed advisors on call for compliance, contracts and appeals.' },
  { id: 'mock', icon: 'MessageSquare', title: 'Mock Visa Interview', desc: 'Realistic practice rounds with consular-style questions and feedback.' },
  { id: 'appt', icon: 'CalendarClock', title: 'Appointment Scheduling', desc: 'We secure the earliest slot, monitor for cancellations, rebook on your behalf.' },
  { id: 'travel', icon: 'Plane', title: 'Travel & Post-Visa', desc: 'Forex, SIM, airport pickup, accommodation — the soft landing covered.' },
  { id: 'support', icon: 'LifeBuoy', title: 'Support & Tracking', desc: 'Live status on every application via SMS, email and our customer portal.' },
];

export const FEATURES = [
  { id: 'aidoc', title: 'Document review by experts', desc: 'Every passport, photo and bank statement is reviewed by a senior consultant before submission.', icon: 'ScanLine' },
  { id: 'guarantee', title: 'On‑time guarantee', desc: 'If your visa is late through our fault, we refund the full service fee. No fine print.', icon: 'ShieldCheck' },
  { id: 'humans', title: 'Real humans, walk‑in welcome', desc: 'Drop into our Ballari office anytime Mon–Sat. Calls answered in under three rings.', icon: 'Headphones' },
  { id: 'secure', title: 'Bank‑grade security', desc: 'Encrypted vault for every document. We delete originals 30 days after a successful visa.', icon: 'Lock' },
];

export const TESTIMONIALS = [
  { id: 't1', name: 'Priya Sharma', role: 'IT Engineer, Bangalore', quote: 'We Hive turned my U.S. B1/B2 around in 11 days. The mock interview was the closest thing to the real consulate I could ask for.', avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=entropy&cs=srgb&fm=jpg&q=80&w=200', country: 'USA' },
  { id: 't2', name: 'Marcus Bennett', role: 'Senior Consultant', quote: 'Sixth Schengen of my life — first time it actually felt simple. Wehive handled everything from documents to embassy slots.', avatar: 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?crop=entropy&cs=srgb&fm=jpg&q=80&w=200', country: 'France' },
  { id: 't3', name: 'Aisha Rahman', role: 'Travel writer, Hyderabad', quote: 'Tracking was the killer feature. Each checkpoint cleared in real time on the dashboard.', avatar: 'https://images.unsplash.com/photo-1627161683077-e34782c24d81?crop=entropy&cs=srgb&fm=jpg&q=80&w=200', country: 'UK' },
  { id: 't4', name: 'Daniel Cho', role: 'Product Manager', quote: 'Three of us applied for a Tokyo offsite. Wehive coordinated all of it. Zero spreadsheets.', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=srgb&fm=jpg&q=80&w=200', country: 'Japan' },
  { id: 't5', name: 'Rohan Mehta', role: 'Founder, Mehta & Co', quote: 'My UAE visa was approved in 38 hours. The Wehive team made the entire process feel premium.', avatar: 'https://images.pexels.com/photos/31880922/pexels-photo-31880922.jpeg?auto=compress&cs=tinysrgb&w=200', country: 'UAE' },
  { id: 't6', name: 'Elena Russo', role: 'Photographer', quote: 'Wedding in Tuscany three weeks away — Schengen done in nine days. Lifesavers.', avatar: 'https://images.pexels.com/photos/31880869/pexels-photo-31880869.jpeg?auto=compress&cs=tinysrgb&w=200', country: 'Italy' },
];

export const FAQS = [
  { id: 'q1', q: 'How does the on‑time guarantee work?', a: 'If your visa is delayed beyond the date we promised — and the delay is on our side — we refund the entire We Hive service fee. No paperwork required from you.' },
  { id: 'q2', q: 'Which documents do I need to upload?', a: 'It varies by destination — typically a passport scan, recent photo and bank statements from the last 3 months. Our portal lists the exact requirements once you pick a country.' },
  { id: 'q3', q: 'Is my data safe with We Hive?', a: 'Yes. All uploads are encrypted, stored in a SOC 2 vault and permanently erased 30 days after your visa is approved.' },
  { id: 'q4', q: 'Can I apply for my whole family in one go?', a: 'Absolutely. Add up to eight applicants per case. Documents, payments and tracking stay in one place.' },
  { id: 'q5', q: 'Do you offer rush processing?', a: 'For 22 destinations we offer Same‑Day and 48‑Hour rush. Availability shows up at checkout based on your travel date.' },
  { id: 'q6', q: 'What if my visa is rejected?', a: 'In the rare case of refusal not caused by misrepresentation, we refund 100% of the We Hive service fee and rebook a new appointment for free.' },
];

export const PRESS = ['TechCrunch', 'Forbes', 'Bloomberg', 'The Verge', 'Wired', 'Condé Nast Traveler'];

// Pricing constants — extracted for clarity (review fix)
export const PRICING = { LITE: 49, STANDARD: 99, CONCIERGE: 249 };

export const PLANS = [
  { id: 'lite', name: 'Lite', price: PRICING.LITE, tag: 'For occasional travel', features: ['One visa application', 'Document review by an expert', 'Email support', '7–10 day processing'] },
  { id: 'standard', name: 'Standard', price: PRICING.STANDARD, tag: 'Most popular', highlighted: true, features: ['Everything in Lite', 'Priority chat support', 'On‑time guarantee', 'Up to 4 applicants', 'Real‑time tracking'] },
  { id: 'concierge', name: 'Concierge', price: PRICING.CONCIERGE, tag: 'White‑glove service', features: ['Everything in Standard', 'Dedicated visa specialist', 'Same‑day rush eligible', 'Up to 8 applicants', 'Phone support, 24/7'] },
];

// Footer columns with stable IDs (review fix)
export const FOOTER_COLS = [
  { id: 'visas', title: 'Popular visas', links: [
    { id: 'l-us', label: 'United States', to: '/visa/us' },
    { id: 'l-uk', label: 'United Kingdom', to: '/visa/uk' },
    { id: 'l-fr', label: 'Schengen', to: '/visa/fr' },
    { id: 'l-jp', label: 'Japan', to: '/visa/jp' },
    { id: 'l-sg', label: 'Singapore', to: '/visa/sg' },
    { id: 'l-ae', label: 'UAE', to: '/visa/ae' },
  ]},
  { id: 'company', title: 'Company', links: [
    { id: 'l-about', label: 'About', to: '/about' },
    { id: 'l-services', label: 'Services', to: '/#services' },
    { id: 'l-team', label: 'Team', to: '/about' },
    { id: 'l-contact', label: 'Contact', to: '/#contact' },
    { id: 'l-trust', label: 'Trust & safety', to: '/about' },
  ]},
  { id: 'resources', title: 'Resources', links: [
    { id: 'l-help', label: 'Help center', to: '/help' },
    { id: 'l-guide', label: 'Visa guides', to: '/' },
    { id: 'l-embassy', label: 'Embassy directory', to: '/' },
    { id: 'l-refund', label: 'Refund policy', to: '/' },
    { id: 'l-status', label: 'Status', to: '/' },
  ]},
  { id: 'legal', title: 'Legal', links: [
    { id: 'l-terms', label: 'Terms', to: '/' },
    { id: 'l-privacy', label: 'Privacy', to: '/' },
    { id: 'l-cookies', label: 'Cookies', to: '/' },
    { id: 'l-access', label: 'Accessibility', to: '/' },
  ]},
];
