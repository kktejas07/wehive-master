export type Channel = 'email' | 'whatsapp' | 'sms';

export function channelFor(identifier: string): Channel {
  return identifier.includes('@') ? 'email' : 'whatsapp';
}

export function normaliseIdentifier(raw: string): string {
  const v = raw.trim();
  if (v.includes('@')) return v.toLowerCase();
  const digits = v.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+91${digits.replace(/^0+/, '')}`;
}

export function isValidIdentifier(raw: string): boolean {
  const v = raw.trim();
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  return /^\+?\d{10,15}$/.test(v.replace(/[\s()-]/g, ''));
}
