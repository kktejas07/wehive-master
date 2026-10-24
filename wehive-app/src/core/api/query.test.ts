import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildQuery } from './query.ts';

test('query strings skip empty values and encode the rest', () => {
  assert.equal(buildQuery({ q: 'São Tomé', page: 2, empty: '', none: undefined, flag: false }), '?q=S%C3%A3o%20Tom%C3%A9&page=2&flag=false');
  assert.equal(buildQuery(), '');
});
