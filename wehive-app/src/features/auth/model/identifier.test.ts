import assert from 'node:assert/strict';
import { test } from 'node:test';

import { channelFor, isValidIdentifier, normaliseIdentifier } from './identifier.ts';

test('email goes by email, phone by WhatsApp', () => {
  assert.equal(channelFor('a@b.in'), 'email');
  assert.equal(channelFor('+919000000000'), 'whatsapp');
});

test('identifiers are normalised the way the backend expects', () => {
  assert.equal(normaliseIdentifier('  Me@WeHive.co.in '), 'me@wehive.co.in');
  assert.equal(normaliseIdentifier('090007 34326'), '+919000734326');
  assert.equal(normaliseIdentifier('+1 (609) 555-0100'), '+16095550100');
});

test('validation rejects half-typed input', () => {
  assert.ok(isValidIdentifier('me@wehive.co.in'));
  assert.ok(isValidIdentifier('98765 43210'));
  assert.ok(!isValidIdentifier('me@wehive'));
  assert.ok(!isValidIdentifier('12345'));
});
