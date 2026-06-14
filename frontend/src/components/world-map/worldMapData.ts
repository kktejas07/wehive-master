export interface Hub {
  id: string;
  name: string;
  flag: string;
  x: number;
  y: number;
}

export const HUBS: Hub[] = [
  { id: 'usa',         name: 'United States',  flag: 'us', x: 18,  y: 32  },
  { id: 'canada',      name: 'Canada',         flag: 'ca', x: 16,  y: 19  },
  { id: 'uk',          name: 'United Kingdom', flag: 'gb', x: 46,  y: 21  },
  { id: 'france',      name: 'France',         flag: 'fr', x: 48,  y: 25  },
  { id: 'germany',     name: 'Germany',        flag: 'de', x: 50,  y: 23  },
  { id: 'spain',       name: 'Spain',          flag: 'es', x: 47,  y: 28  },
  { id: 'italy',       name: 'Italy',          flag: 'it', x: 50,  y: 27  },
  { id: 'uae',         name: 'UAE',            flag: 'ae', x: 63,  y: 40  },
  { id: 'india',       name: 'India',          flag: 'in', x: 70,  y: 41  },
  { id: 'singapore',   name: 'Singapore',      flag: 'sg', x: 78,  y: 52  },
  { id: 'japan',       name: 'Japan',          flag: 'jp', x: 87,  y: 29  },
  { id: 'south-korea', name: 'South Korea',    flag: 'kr', x: 85,  y: 27  },
  { id: 'australia',   name: 'Australia',      flag: 'au', x: 84,  y: 70  },
  { id: 'new-zealand', name: 'New Zealand',    flag: 'nz', x: 93,  y: 80  },
];

export const CONNECTIONS = [
  ['india', 'usa'],
  ['india', 'uk'],
  ['india', 'uae'],
  ['india', 'singapore'],
  ['india', 'australia'],
  ['india', 'japan'],
  ['usa', 'canada'],
  ['usa', 'japan'],
  ['uk', 'germany'],
  ['uk', 'france'],
  ['uk', 'italy'],
  ['uk', 'spain'],
  ['australia', 'new-zealand'],
  ['india', 'germany'],
  ['uae', 'singapore'],
];

export const NAVY = '#081A4E';
export const ACCENT = '#E1212C';
export const BLUE_GLOW = '#3B82F6';

export function flagUrl(code) {
  return `https://flagcdn.com/24x18/${code}.png`;
}
