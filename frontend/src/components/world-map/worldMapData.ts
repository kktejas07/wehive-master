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
  { id: 'canada',      name: 'Canada',         flag: 'ca', x: 13.5, y: 9.5,   labelDx: 0,   labelDy: -22 },
  { id: 'usa',         name: 'United States',  flag: 'us', x: 17,   y: 17,    labelDx: 14,  labelDy: -18 },
  { id: 'uk',          name: 'United Kingdom', flag: 'gb', x: 43.5, y: 12.5,  labelDx: -18, labelDy: -20 },
  { id: 'france',      name: 'France',         flag: 'fr', x: 46.5, y: 15.5,  labelDx: -16, labelDy: 14  },
  { id: 'germany',     name: 'Germany',        flag: 'de', x: 49.5, y: 13.5,  labelDx: 16,  labelDy: -18 },
  { id: 'uae',         name: 'UAE',            flag: 'ae', x: 60.5, y: 27,    labelDx: 0,   labelDy: -22 },
  { id: 'india',       name: 'India',          flag: 'in', x: 66.5, y: 26.5,  labelDx: 0,   labelDy: -22, tooltipDx: 0, tooltipDy: -120 },
  { id: 'singapore',   name: 'Singapore',      flag: 'sg', x: 78.5, y: 24.5,  labelDx: 14,  labelDy: 12  },
  { id: 'japan',       name: 'Japan',          flag: 'jp', x: 87.5, y: 19.5,  labelDx: 16,  labelDy: -18 },
  { id: 'south-korea', name: 'South Korea',    flag: 'kr', x: 85.5, y: 18.5,  labelDx: -20, labelDy: -18 },
  { id: 'australia',   name: 'Australia',      flag: 'au', x: 83.5, y: 37.5,  labelDx: 0,   labelDy: -22 },
  { id: 'new-zealand', name: 'New Zealand',    flag: 'nz', x: 92.5, y: 40.5,  labelDx: 14,  labelDy: -18 },
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
