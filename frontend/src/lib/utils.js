import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

let _currency = 'INR';
let _locale = 'en-IN';

export function setCurrency(code) {
  _currency = code || 'INR';
  _locale = code === 'USD' ? 'en-US' : code === 'EUR' ? 'de-DE' : code === 'GBP' ? 'en-GB' : 'en-IN';
}

export function getCurrency() {
  return _currency;
}

export function inr(n) {
  try {
    return new Intl.NumberFormat(_locale, { style: 'currency', currency: _currency, maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[_currency] || _currency;
    return `${sym}${n || 0}`;
  }
}

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export function statusColor(s) {
  return STATUS_COLORS[s] || 'bg-slate-100 text-slate-700';
}

export function countryFlag(code) {
  if (!code || typeof code !== 'string') return '';
  const c = code.toUpperCase();
  if (c.length !== 2) return '';
  const OFFSET = 0x1F1E6 - 65;
  return String.fromCodePoint(c.charCodeAt(0) + OFFSET, c.charCodeAt(1) + OFFSET);
}

const UNI_DOMAINS = {
  mit: 'mit.edu',
  stanford: 'stanford.edu',
  harvard: 'harvard.edu',
  oxford: 'ox.ac.uk',
  cambridge: 'cam.ac.uk',
  imperial: 'imperial.ac.uk',
  ucl: 'ucl.ac.uk',
  lse: 'lse.ac.uk',
  edinburgh: 'ed.ac.uk',
  manchester: 'manchester.ac.uk',
  kcl: 'kcl.ac.uk',
  bristol: 'bristol.ac.uk',
  warwick: 'warwick.ac.uk',
  eth: 'ethz.ch',
  epfl: 'epfl.ch',
  tum: 'tum.de',
  lmu: 'lmu.de',
  heidelberg: 'uni-heidelberg.de',
  humboldt: 'hu-berlin.de',
  polimi: 'polimi.it',
  unibo: 'unibo.it',
  sapienza: 'uniroma1.it',
  kuleuven: 'kuleuven.be',
  delft: 'tudelft.nl',
  uva: 'uva.nl',
  toronto: 'utoronto.ca',
  mcgill: 'mcgill.ca',
  ubc: 'ubc.ca',
  melbourne: 'unimelb.edu.au',
  sydney: 'sydney.edu.au',
  anu: 'anu.edu.au',
  nus: 'nus.edu.sg',
  ntu: 'ntu.edu.sg',
  tokyo: 'u-tokyo.ac.jp',
  kyoto: 'kyoto-u.ac.jp',
};

export function universityLogo(universityId, shortName) {
  const domain = UNI_DOMAINS[universityId];
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(shortName || universityId)}&background=1a2a5e&color=fff&size=96&bold=true&format=png`;
}
