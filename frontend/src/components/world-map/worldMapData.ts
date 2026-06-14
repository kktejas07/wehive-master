export interface Hub {
  id: string;
  name: string;
  flag: string;
  x: number;
  y: number;
}

export const HUBS: Hub[] = [
  { id: 'usa',         name: 'USA',         flag: '🇺🇸', x: 18,    y: 34   },
  { id: 'canada',      name: 'Canada',      flag: '🇨🇦', x: 17,    y: 20   },
  { id: 'uk',          name: 'UK',          flag: '🇬🇧', x: 48,    y: 24   },
  { id: 'france',      name: 'France',      flag: '🇫🇷', x: 49.5,  y: 29   },
  { id: 'germany',     name: 'Germany',     flag: '🇩🇪', x: 52,    y: 27   },
  { id: 'uae',         name: 'UAE',         flag: '🇦🇪', x: 62,    y: 42   },
  { id: 'india',       name: 'India',       flag: '🇮🇳', x: 70,    y: 45   },
  { id: 'singapore',   name: 'Singapore',   flag: '🇸🇬', x: 76,    y: 56   },
  { id: 'japan',       name: 'Japan',       flag: '🇯🇵', x: 86,    y: 35   },
  { id: 'south-korea', name: 'South Korea', flag: '🇰🇷', x: 83.5,  y: 34   },
  { id: 'australia',   name: 'Australia',   flag: '🇦🇺', x: 84,    y: 73   },
  { id: 'new-zealand', name: 'New Zealand', flag: '🇳🇿', x: 93,    y: 82   },
];

export const CONNECTIONS: [string, string][] = [
  ['india', 'usa'],
  ['india', 'uk'],
  ['india', 'uae'],
  ['india', 'singapore'],
  ['india', 'australia'],
  ['usa', 'canada'],
  ['usa', 'japan'],
  ['uk', 'france'],
  ['uk', 'germany'],
  ['uae', 'singapore'],
  ['australia', 'new-zealand'],
  ['japan', 'south-korea'],
  ['india', 'japan'],
  ['india', 'south-korea'],
  ['usa', 'uk'],
];

export const NAVY = '#0A2C8A';
export const ACCENT = '#E1212C';
export const NAVY_LIGHT = '#1E4DB1';

export const HUBS_MAJOR = ['india', 'usa', 'uk', 'uae'];
