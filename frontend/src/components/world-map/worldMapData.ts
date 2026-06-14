export interface Hub {
  id: string;
  name: string;
  flag?: string;
  x: number;
  y: number;
  visaTypes: string[];
}

export const HUBS: Hub[] = [
  { id: 'usa',         name: 'United States',   x: 16,  y: 28,  visaTypes: ['Work Visa', 'Student Visa', 'Tourist Visa', 'Business Visa'] },
  { id: 'canada',      name: 'Canada',          x: 14,  y: 16,  visaTypes: ['Student Visa', 'Tourist Visa', 'Work Permit'] },
  { id: 'uk',          name: 'United Kingdom',  x: 46,  y: 18,  visaTypes: ['Student Visa', 'Work Visa', 'Tourist Visa'] },
  { id: 'france',      name: 'France',          x: 47.5, y: 22,  visaTypes: ['Tourist Visa', 'Student Visa'] },
  { id: 'germany',     name: 'Germany',         x: 50,  y: 20,  visaTypes: ['Student Visa', 'Work Visa', 'Tourist Visa'] },
  { id: 'italy',       name: 'Italy',           x: 49,  y: 24,  visaTypes: ['Tourist Visa', 'Student Visa'] },
  { id: 'spain',       name: 'Spain',           x: 46,  y: 26,  visaTypes: ['Tourist Visa', 'Student Visa'] },
  { id: 'switzerland', name: 'Switzerland',     x: 49,  y: 22.5, visaTypes: ['Tourist Visa', 'Work Visa'] },
  { id: 'uae',         name: 'UAE',             x: 62,  y: 36,  visaTypes: ['Tourist Visa', 'Work Visa', 'Business Visa'] },
  { id: 'saudi',       name: 'Saudi Arabia',    x: 60,  y: 39,  visaTypes: ['Work Visa', 'Business Visa'] },
  { id: 'india',       name: 'India',           x: 70,  y: 38,  visaTypes: ['Work Visa', 'Student Visa', 'Tourist Visa', 'Business Visa'] },
  { id: 'singapore',   name: 'Singapore',       x: 77,  y: 47,  visaTypes: ['Tourist Visa', 'Work Visa', 'Student Visa'] },
  { id: 'japan',       name: 'Japan',           x: 88,  y: 27,  visaTypes: ['Student Visa', 'Tourist Visa', 'Work Visa', 'Business Visa'] },
  { id: 'south-korea', name: 'South Korea',     x: 86,  y: 26,  visaTypes: ['Tourist Visa', 'Student Visa', 'Business Visa'] },
  { id: 'australia',   name: 'Australia',       x: 84,  y: 66,  visaTypes: ['Student Visa', 'Tourist Visa', 'Work Visa'] },
  { id: 'new-zealand', name: 'New Zealand',     x: 93,  y: 76,  visaTypes: ['Student Visa', 'Tourist Visa', 'Work Visa'] },
];

export const CONNECTIONS: [string, string][] = [
  ['india', 'usa'],
  ['india', 'uk'],
  ['india', 'uae'],
  ['india', 'australia'],
  ['india', 'singapore'],
  ['india', 'japan'],
  ['usa', 'canada'],
  ['usa', 'japan'],
  ['uk', 'france'],
  ['uk', 'germany'],
  ['australia', 'new-zealand'],
  ['uae', 'singapore'],
  ['india', 'saudi'],
  ['india', 'germany'],
  ['uk', 'italy'],
];

export const NAVY = '#081C5A';
export const ACCENT = '#E1212C';
export const BLUE_GLOW = '#3B82F6';
