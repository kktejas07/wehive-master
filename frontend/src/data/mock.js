// Mock data for Wehive — Visa Processing Platform

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
  { value: '700K+', label: 'Visas processed' },
  { value: '150+', label: 'Countries supported' },
  { value: '99.2%', label: 'Approval rate' },
  { value: '4.9 / 5', label: 'Customer rating' },
];

export const STEPS = [
  {
    id: 1,
    title: 'Tell us where',
    desc: 'Pick your destination and travel dates. We instantly match you to the right visa.',
  },
  {
    id: 2,
    title: 'Snap your documents',
    desc: 'Upload from your phone. Our AI checks every page in seconds, flags issues before they happen.',
  },
  {
    id: 3,
    title: 'Approved on time',
    desc: 'Track your application live. Your visa lands in your inbox — guaranteed before your trip.',
  },
];

export const FEATURES = [
  {
    title: 'AI document review',
    desc: 'Every passport, photo and bank statement is reviewed by our AI in under 30 seconds.',
    icon: 'ScanLine',
  },
  {
    title: 'On‑time guarantee',
    desc: 'If your visa is late, we refund the full government fee. No questions, no fine print.',
    icon: 'ShieldCheck',
  },
  {
    title: 'Real humans, 24/7',
    desc: 'Visa specialists in three timezones reply in under 4 minutes, day or night.',
    icon: 'Headphones',
  },
  {
    title: 'Bank‑grade security',
    desc: 'SOC 2 + AES‑256 encryption. Your documents are deleted 30 days after approval.',
    icon: 'Lock',
  },
];

export const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Founder, Lumen Studio',
    quote:
      'Wehive processed my U.S. B1/B2 in 11 days flat. The document review caught a missing stamp before I submitted — saved me a refusal.',
    avatar:
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=entropy&cs=srgb&fm=jpg&q=80&w=200',
    country: 'USA',
  },
  {
    name: 'Marcus Bennett',
    role: 'Senior Engineer, Stripe',
    quote:
      'I have done five Schengen visas the old way. Wehive made the sixth feel like ordering an Uber. I will never go back.',
    avatar:
      'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?crop=entropy&cs=srgb&fm=jpg&q=80&w=200',
    country: 'France',
  },
  {
    name: 'Aisha Rahman',
    role: 'Travel writer',
    quote:
      'Tracking was the killer feature. I knew the embassy had received my file, the officer who reviewed it, and when to expect approval.',
    avatar:
      'https://images.unsplash.com/photo-1627161683077-e34782c24d81?crop=entropy&cs=srgb&fm=jpg&q=80&w=200',
    country: 'UK',
  },
  {
    name: 'Daniel Cho',
    role: 'Product Manager, Notion',
    quote:
      'Three of us applied together for a team offsite in Tokyo. Wehive coordinated all of it. Zero spreadsheets.',
    avatar:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=srgb&fm=jpg&q=80&w=200',
    country: 'Japan',
  },
  {
    name: 'Rohan Mehta',
    role: 'Independent consultant',
    quote:
      'My UAE visa came through in 38 hours. The dashboard literally showed me each checkpoint clearing in real time.',
    avatar:
      'https://images.pexels.com/photos/31880922/pexels-photo-31880922.jpeg?auto=compress&cs=tinysrgb&w=200',
    country: 'UAE',
  },
  {
    name: 'Elena Russo',
    role: 'Photographer',
    quote:
      'I had a wedding in Tuscany in three weeks. Wehive turned my Schengen around in nine days. Lifesaver.',
    avatar:
      'https://images.pexels.com/photos/31880869/pexels-photo-31880869.jpeg?auto=compress&cs=tinysrgb&w=200',
    country: 'Italy',
  },
];

export const FAQS = [
  {
    q: 'How does the on‑time guarantee work?',
    a: 'If your visa does not arrive on or before the date Wehive promised at checkout, we refund the entire government fee — automatically, with no paperwork from your side.',
  },
  {
    q: 'Which documents do I need to upload?',
    a: 'It varies by destination, but typically a clear passport scan, a recent passport‑size photo and bank statements from the last 3 months. Our app shows you the exact list before you pay.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Wehive is SOC 2 Type II certified, all uploads are AES‑256 encrypted in transit and at rest, and your documents are permanently erased 30 days after a successful visa.',
  },
  {
    q: 'Can I apply for my whole family in one place?',
    a: 'Absolutely. Add up to eight applicants per booking. Documents, payment and tracking stay on a single dashboard.',
  },
  {
    q: 'Do you offer rush processing?',
    a: 'For 22 destinations we offer Same‑Day and 48‑Hour Rush. You will see availability based on your travel date once you pick a country.',
  },
  {
    q: 'What if my visa is rejected?',
    a: 'In the rare case of a refusal not caused by misrepresentation, we refund 100% of the Wehive service fee and rebook a new appointment for free.',
  },
];

export const PRESS = [
  'TechCrunch',
  'Forbes',
  'Bloomberg',
  'The Verge',
  'Wired',
  'Cond\u00E9 Nast Traveler',
];

export const PLANS = [
  {
    id: 'lite',
    name: 'Lite',
    price: 49,
    tag: 'For occasional travel',
    features: [
      'One visa application',
      'AI document review',
      'Email support',
      '7‑10 day processing',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 99,
    tag: 'Most popular',
    highlighted: true,
    features: [
      'Everything in Lite',
      'Priority chat support',
      'On‑time guarantee',
      'Up to 4 applicants',
      'Real‑time tracking',
    ],
  },
  {
    id: 'concierge',
    name: 'Concierge',
    price: 249,
    tag: 'White‑glove service',
    features: [
      'Everything in Standard',
      'Dedicated visa specialist',
      'Same‑day rush eligible',
      'Up to 8 applicants',
      'Phone support, 24/7',
    ],
  },
];
