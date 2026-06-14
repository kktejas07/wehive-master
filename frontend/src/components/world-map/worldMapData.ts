export interface Hub {
  id: string;
  name: string;
  flag: string;
  x: number;
  y: number;
}

/** Coordinates aligned to the 100×50 viewBox continent paths */
export const HUBS: Hub[] = [
  { id: 'canada',      name: 'Canada',         flag: 'ca', x: 14,  y: 10  },
  { id: 'usa',         name: 'United States',  flag: 'us', x: 16,  y: 18  },
  { id: 'uk',          name: 'United Kingdom', flag: 'gb', x: 44,  y: 13  },
  { id: 'france',      name: 'France',         flag: 'fr', x: 47,  y: 16  },
  { id: 'germany',     name: 'Germany',        flag: 'de', x: 50,  y: 14  },
  { id: 'uae',         name: 'UAE',            flag: 'ae', x: 61,  y: 28  },
  { id: 'india',       name: 'India',          flag: 'in', x: 67,  y: 27  },
  { id: 'singapore',   name: 'Singapore',      flag: 'sg', x: 79,  y: 25  },
  { id: 'japan',       name: 'Japan',          flag: 'jp', x: 88,  y: 20  },
  { id: 'south-korea', name: 'South Korea',    flag: 'kr', x: 86,  y: 19  },
  { id: 'australia',   name: 'Australia',      flag: 'au', x: 84,  y: 38  },
  { id: 'new-zealand', name: 'New Zealand',    flag: 'nz', x: 93,  y: 41  },
];

export const CONNECTIONS: [string, string][] = [
  ['india', 'usa'],
  ['india', 'uk'],
  ['india', 'uae'],
  ['india', 'singapore'],
  ['india', 'australia'],
  ['india', 'japan'],
  ['usa', 'canada'],
  ['usa', 'uk'],
  ['uk', 'germany'],
  ['uk', 'france'],
  ['germany', 'uae'],
  ['uae', 'singapore'],
  ['singapore', 'japan'],
  ['japan', 'south-korea'],
  ['australia', 'new-zealand'],
];

export const NAVY = '#000814';
export const ACCENT = '#00D4FF';
export const BLUE_GLOW = '#00D4FF';

export function flagUrl(code: string) {
  return `https://flagcdn.com/24x18/${code}.png`;
}
