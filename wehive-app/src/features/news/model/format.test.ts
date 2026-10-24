import assert from 'node:assert/strict';
import { test } from 'node:test';

import { preview, relativeTime } from './format.ts';

test('relative time reads naturally', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  assert.equal(relativeTime('2026-10-24T11:30:00Z', now), '30m ago');
  assert.equal(relativeTime('2026-10-24T02:00:00Z', now), '10h ago');
  assert.equal(relativeTime('2026-10-21T12:00:00Z', now), '3d ago');
  assert.equal(relativeTime(null, now), '');
  assert.equal(relativeTime('not a date', now), '');
});

test('preview strips feed HTML and trims long text', () => {
  assert.equal(preview('<p>Fees&nbsp;change &amp; rise</p>'), 'Fees change & rise');
  const long = preview('word '.repeat(100), 20);
  assert.ok(long.length <= 20 && long.endsWith('…'));
});
