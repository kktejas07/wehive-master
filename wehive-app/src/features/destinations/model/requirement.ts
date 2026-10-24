import type { ChipTone } from '@/core/ui/chip';

import type { ApplicantRule, Country, DecisionTime, Processing } from './types';

/** How a requirement is shown: one label and one tone everywhere in the app. */
export function requirementBadge(p?: Processing): { label: string; tone: ChipTone } {
  switch (p?.requirement) {
    case 'visa_free': return { label: 'No visa needed', tone: 'success' };
    case 'on_arrival': return { label: 'On arrival', tone: 'success' };
    case 'evisa': return { label: 'eVisa', tone: 'info' };
    case 'evisa_or_on_arrival': return { label: 'eVisa / on arrival', tone: 'info' };
    case 'visa': return { label: p.schengen ? 'Schengen visa' : 'Visa required', tone: 'warning' };
    case 'restricted': return { label: 'Restricted', tone: 'danger' };
    default: return { label: 'Special permit', tone: 'neutral' };
  }
}

export const BASIS_LABEL: Record<DecisionTime['basis'], string> = {
  official: 'Official figure',
  law: 'Set by EU law',
  estimate: 'WeHive estimate',
};

export const RULE_BASIS_LABEL: Record<ApplicantRule['basis'], { label: string; tone: ChipTone }> = {
  law: { label: 'EU law', tone: 'info' },
  official: { label: 'Official', tone: 'success' },
  source: { label: 'Current rules', tone: 'neutral' },
  guidance: { label: 'WeHive tip', tone: 'warning' },
};

/** Expected decision dates if the user applied today. */
export function decisionWindow(t: DecisionTime, from: Date = new Date()): { earliest: Date; latest: Date } {
  const add = (d: number) => new Date(from.getTime() + d * 86_400_000);
  return { earliest: add(t.min_days), latest: add(t.max_days) };
}

export function sortForBrowsing(items: Country[]): Country[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
