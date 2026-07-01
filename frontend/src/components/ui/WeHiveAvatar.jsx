const PALETTES = [
  { bg: '#0a2c8a', accent: '#ffffff', hat: '#e1212c' },
  { bg: '#e1212c', accent: '#ffffff', hat: '#0a2c8a' },
  { bg: '#1e3a5f', accent: '#f0f4ff', hat: '#c41e3a' },
  { bg: '#2d1b69', accent: '#f0f0ff', hat: '#e8a020' },
];

function avatarSvg(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const p = PALETTES[Math.abs(hash) % PALETTES.length];
  const bg = p.bg;
  const accent = p.accent;
  const hat = p.hat;
  const eyeOffset = (hash % 3) - 1;
  const mouthType = Math.abs(hash) % 4;

  let mouth;
  if (mouthType === 0) mouth = `<path d="M14 18q0 0 0 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>`;
  else if (mouthType === 1) mouth = `<path d="M11 18a3 3 0 006 0" stroke="${accent}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  else if (mouthType === 2) mouth = `<path d="M12 19h4" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>`;
  else mouth = `<circle cx="14" cy="18" r="1.5" fill="${accent}" opacity="0.4"/>`;

  return `data:image/svg+xml,${encodeURIComponent(`<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="14" fill="${bg}"/>
    <!-- nose -->
    <path d="M14 14h0" stroke="${accent}" stroke-width="1" opacity="0.3"/>
    <!-- face outline -->
    <circle cx="14" cy="13" r="7" fill="${bg}" stroke="${accent}" stroke-width="0.8" opacity="0.2"/>
    <!-- eyes -->
    <circle cx="${11 + eyeOffset}" cy="13.5" r="1.2" fill="${accent}" opacity="0.8"/>
    <circle cx="${17 + eyeOffset}" cy="13.5" r="1.2" fill="${accent}" opacity="0.8"/>
    <!-- glasses -->
    <circle cx="${11 + eyeOffset}" cy="13.5" r="2.5" stroke="${accent}" stroke-width="0.5" fill="none" opacity="0.25"/>
    <circle cx="${17 + eyeOffset}" cy="13.5" r="2.5" stroke="${accent}" stroke-width="0.5" fill="none" opacity="0.25"/>
    <line x1="${13.5 + eyeOffset}" y1="13.5" x2="${14.5 + eyeOffset}" y2="13.5" stroke="${accent}" stroke-width="0.5" opacity="0.25"/>
    ${mouth}
    <!-- hat/accent -->
    <path d="M9 8q5-3 10 0" stroke="${hat}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M10 8.5L10 6.5" stroke="${hat}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M15 8L15 7" stroke="${hat}" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
  </svg>`)}`;
}

export function WeHiveAvatar({ seed = 'wehive', size = 28, className = '' }) {
  return (
    <img
      src={avatarSvg(seed)}
      alt=""
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

export function avatarDataUri(seed = 'wehive') {
  return avatarSvg(seed);
}

export default WeHiveAvatar;
