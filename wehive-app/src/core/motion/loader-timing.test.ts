import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextVariant, phase, STEP_ON, STEP_OFF, takeVariant, VARIANTS } from './loader-timing.ts';

test('consecutive loaders cycle through all three designs', () => {
  const seen = [takeVariant(), takeVariant(), takeVariant()];
  assert.deepEqual([...seen].sort(), [...VARIANTS].sort());
  assert.equal(takeVariant(), seen[0]);
  assert.equal(nextVariant('radar'), 'thinking');
  assert.equal(nextVariant('thinking'), 'flight-plan');
});

test('delayed loops wrap into [0, 1)', () => {
  assert.equal(phase(0.5, 0.25), 0.25);
  assert.equal(phase(0.1, 0.25), 0.85);
  assert.equal(phase(0, 0), 0);
});

test('flight-plan steps light up in order before the reset', () => {
  assert.deepEqual([...STEP_ON], [...STEP_ON].sort((a, b) => a - b));
  assert.ok(STEP_ON[STEP_ON.length - 1] < STEP_OFF);
});
