export interface Hub {
  id: string;
  name: string;
  flag: string;
  x: number;
  y: number;
  labelDx?: number;
  labelDy?: number;
  tooltipDx?: number;
  tooltipDy?: number;
}

export const HUBS: Hub[] = [
  { id: 'canada',      name: 'Canada',         flag: 'ca', x: 24,   y: 10,    labelDx: 0,   labelDy: -22 },
  { id: 'usa',         name: 'United States',  flag: 'us', x: 20,   y: 14,    labelDx: 8,   labelDy: -16 },
  { id: 'uk',          name: 'United Kingdom', flag: 'gb', x: 49,   y: 9.5,   labelDx: -6,  labelDy: -20 },
  { id: 'france',      name: 'France',         flag: 'fr', x: 50,   y: 12.5,  labelDx: -20, labelDy: 14  },
  { id: 'germany',     name: 'Germany',        flag: 'de', x: 53.5, y: 10.5,  labelDx: 18,  labelDy: -16 },
  { id: 'uae',         name: 'UAE',            flag: 'ae', x: 64.5, y: 18.5,  labelDx: -4,  labelDy: -22 },
  { id: 'india',       name: 'India',          flag: 'in', x: 71,   y: 19.5,  labelDx: 6,   labelDy: -22, tooltipDx: 0, tooltipDy: -120 },
  { id: 'singapore',   name: 'Singapore',      flag: 'sg', x: 78,   y: 24,    labelDx: 18,  labelDy: 10  },
  { id: 'japan',       name: 'Japan',          flag: 'jp', x: 88.5, y: 15,    labelDx: 18,  labelDy: -12 },
  { id: 'south-korea', name: 'South Korea',    flag: 'kr', x: 84.5, y: 15.5,  labelDx: -22, labelDy: -14 },
  { id: 'australia',   name: 'Australia',      flag: 'au', x: 87,   y: 32,    labelDx: 6,   labelDy: -22 },
  { id: 'new-zealand', name: 'New Zealand',    flag: 'nz', x: 94,   y: 38,    labelDx: 16,  labelDy: -6  },
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

export const PLANE_ROUTES: [string, string][] = [
  ['india', 'usa'],
  ['india', 'uk'],
  ['india', 'australia'],
  ['usa', 'uk'],
  ['uae', 'singapore'],
  ['singapore', 'japan'],
  ['japan', 'south-korea'],
  ['australia', 'new-zealand'],
];

export const NAVY = '#000B2E';
export const NAVY_LIGHT = '#0A1A3A';
export const ACCENT = '#00E5FF';
export const BLUE_GLOW = '#00D4FF';
export const DOT_COLOR = '#38BDF8';

export function flagUrl(code: string) {
  return `https://flagcdn.com/24x18/${code}.png`;
}
