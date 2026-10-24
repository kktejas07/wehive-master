import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decisionWindow, requirementBadge, sortForBrowsing } from './requirement.ts';

const p = (requirement: string, schengen = false) => ({ requirement, schengen, requirement_label: '', parent: null, note: null, time: null }) as never;

test('requirement badges use one label and tone per rule', () => {
  assert.deepEqual(requirementBadge(p('visa_free')), { label: 'No visa needed', tone: 'success' });
  assert.deepEqual(requirementBadge(p('visa', true)), { label: 'Schengen visa', tone: 'warning' });
  assert.deepEqual(requirementBadge(p('visa')), { label: 'Visa required', tone: 'warning' });
  assert.equal(requirementBadge(p('restricted')).tone, 'danger');
  assert.equal(requirementBadge(undefined).label, 'Special permit');
});

test('decision window counts calendar days from today', () => {
  const from = new Date('2026-10-24T00:00:00Z');
  const w = decisionWindow({ min_days: 15, max_days: 45 } as never, from);
  assert.equal(w.earliest.toISOString().slice(0, 10), '2026-11-08');
  assert.equal(w.latest.toISOString().slice(0, 10), '2026-12-08');
});

test('destinations sort by name without mutating input', () => {
  const input = [{ id: 'us', name: 'United States' }, { id: 'at', name: 'Austria' }] as never[];
  assert.deepEqual(sortForBrowsing(input).map((c: { id: string }) => c.id), ['at', 'us']);
  assert.equal((input[0] as { id: string }).id, 'us');
});
