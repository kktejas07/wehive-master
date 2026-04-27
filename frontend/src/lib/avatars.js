// Avatar generator using DiceBear (no API key, free).
// Returns a stable URL per user id + gender preference.
//
// Styles per gender:
//  - male→ "adventurer"
//  - female → "adventurer" with female accessories
//  - hero  → "micah" — superhero/comic style
//  - other → "personas" (gender neutral)

export function avatarUrl({ seed, gender = 'hero', style }) {
  const s = encodeURIComponent(seed || 'wehive');
  let useStyle = style;
  if (!useStyle) {
    if (gender === 'male' || gender === 'female') useStyle = 'adventurer';
    else if (gender === 'hero') useStyle = 'micah';
    else useStyle = 'personas';
  }
  return `https://api.dicebear.com/7.x/${useStyle}/svg?seed=${s}&backgroundColor=eef2ff,fef2f2,ecfdf5,fffbeb,fdf4ff&radius=20`;
}

// Six superhero-themed presets the user can choose from.
export const HERO_PRESETS = [
  { id: 'h1', label: 'Captain', seed: 'captain-india', style: 'micah' },
  { id: 'h2', label: 'Storm', seed: 'storm-rider', style: 'micah' },
  { id: 'h3', label: 'Phoenix', seed: 'phoenix-fire', style: 'micah' },
  { id: 'h4', label: 'Shadow', seed: 'shadow-blade', style: 'micah' },
  { id: 'h5', label: 'Cosmic', seed: 'cosmic-dawn', style: 'micah' },
  { id: 'h6', label: 'Ranger', seed: 'forest-ranger', style: 'micah' },
];
