export interface Hub {
  id: string;
  name: string;
  flag: string;
  /** Position in image pixel space (viewBox 0 0 1024 576) */
  x: number;
  y: number;
  labelDx?: number;
  labelDy?: number;
  tooltipDx?: number;
  tooltipDy?: number;
}

/** Background world map image (1024×576, 16:9) */
export const MAP_IMAGE = '/images/world-map-dotted.png';
export const MAP_W = 1024;
export const MAP_H = 576;

/** Hubs positioned on the dotted world map image (pixel coordinates). */
export const HUBS: Hub[] = [
  { id: 'canada',      name: 'Canada',         flag: 'ca', x: 245, y: 120, labelDx: 0,   labelDy: -24 },
  { id: 'usa',         name: 'United States',  flag: 'us', x: 162, y: 212, labelDx: 8,   labelDy: -18 },
  { id: 'uk',          name: 'United Kingdom', flag: 'gb', x: 462, y: 156, labelDx: -8,  labelDy: -22 },
  { id: 'france',      name: 'France',         flag: 'fr', x: 476, y: 192, labelDx: -22, labelDy: 16  },
  { id: 'germany',     name: 'Germany',        flag: 'de', x: 500, y: 170, labelDx: 22,  labelDy: -16 },
  { id: 'uae',         name: 'UAE',            flag: 'ae', x: 598, y: 262, labelDx: -4,  labelDy: -24 },
  { id: 'india',       name: 'India',          flag: 'in', x: 652, y: 264, labelDx: 10,  labelDy: -24, tooltipDx: 0, tooltipDy: -130 },
  { id: 'singapore',   name: 'Singapore',      flag: 'sg', x: 724, y: 332, labelDx: 22,  labelDy: 12  },
  { id: 'japan',       name: 'Japan',          flag: 'jp', x: 862, y: 202, labelDx: 22,  labelDy: -14 },
  { id: 'south-korea', name: 'South Korea',    flag: 'kr', x: 832, y: 212, labelDx: -26, labelDy: -16 },
  { id: 'australia',   name: 'Australia',      flag: 'au', x: 824, y: 420, labelDx: 8,   labelDy: -24 },
  { id: 'new-zealand', name: 'New Zealand',    flag: 'nz', x: 912, y: 470, labelDx: 20,  labelDy: -8  },
];

export const CONNECTIONS: [string, string][] = [
  ['india', 'usa'],
  ['india', 'canada'],
  ['india', 'uk'],
  ['india', 'germany'],
  ['india', 'france'],
  ['india', 'uae'],
  ['india', 'singapore'],
  ['india', 'japan'],
  ['india', 'south-korea'],
  ['india', 'australia'],
  ['australia', 'new-zealand'],
  ['usa', 'canada'],
  ['usa', 'japan'],
  ['uk', 'germany'],
  ['uk', 'france'],
];

/** Routes that carry an animated airplane. */
export const PLANE_ROUTES: [string, string][] = [
  ['india', 'usa'],
  ['india', 'uk'],
  ['india', 'australia'],
  ['usa', 'japan'],
];

export const NAVY = '#000B2E';
export const NAVY_LIGHT = '#0A1A3A';
export const ACCENT = '#00E5FF';
export const BLUE_GLOW = '#00D4FF';
export const DOT_COLOR = '#38BDF8';

export function flagUrl(code: string) {
  return `https://flagcdn.com/24x18/${code}.png`;
}
