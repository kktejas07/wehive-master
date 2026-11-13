import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCrashReport } from './payload.ts';

test('an Error becomes a report with its name, message and stack', () => {
  const r = buildCrashReport(new TypeError('boom'), { platform: 'ios', appVersion: '1.0.0', screen: '/track/42', fatal: true });
  assert.equal(r.name, 'TypeError');
  assert.equal(r.message, 'boom');
  assert.match(r.stack, /TypeError: boom/);
  assert.deepEqual([r.platform, r.app_version, r.screen, r.fatal], ['ios', '1.0.0', '/track/42', true]);
});

test('non-Error throws and unknown platforms are normalised', () => {
  assert.equal(buildCrashReport('plain string').message, 'plain string');
  assert.equal(buildCrashReport({ code: 7 }).message, '{"code":7}');
  assert.equal(buildCrashReport(undefined).message, 'Unknown error');
  const r = buildCrashReport(new Error('x'), { platform: 'windows' });
  assert.deepEqual([r.platform, r.fatal, r.app_version, r.screen], ['unknown', false, '', '']);
});

test('fields are cut to the server length caps', () => {
  const err = new Error('m'.repeat(5000));
  err.stack = 's'.repeat(20000);
  const r = buildCrashReport(err, { screen: 'p'.repeat(999), appVersion: 'v'.repeat(99) });
  assert.deepEqual([r.message.length, r.stack.length, r.screen.length, r.app_version.length], [2000, 8000, 300, 40]);
});
