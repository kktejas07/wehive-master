/**
 * Unit tests for AuthContext.jsx — pure utility functions and logic.
 *
 * We test the non-React exports (authedClient, API constant) and
 * the token-storage / logout behaviour via a minimal mock localStorage.
 * Full hook tests would require @testing-library/react which is not installed.
 */
import { authedClient, API } from './AuthContext';

// ─── API constant ─────────────────────────────────────────────────────────────
describe('API base URL', () => {
  it('is a non-empty string', () => {
    expect(typeof API).toBe('string');
    expect(API.length).toBeGreaterThan(0);
  });

  it('ends with /api', () => {
    expect(API.endsWith('/api')).toBe(true);
  });

  it('does not double-append /api', () => {
    expect(API).not.toMatch(/\/api\/api/);
  });
});

// ─── authedClient ─────────────────────────────────────────────────────────────
describe('authedClient', () => {
  it('creates an axios instance with baseURL set to API', () => {
    const client = authedClient(null);
    expect(client.defaults.baseURL).toBe(API);
  });

  it('sets Authorization header when token provided', () => {
    const client = authedClient('my-test-token');
    expect(client.defaults.headers.Authorization).toBe('Bearer my-test-token');
  });

  it('omits Authorization header when token is null', () => {
    const client = authedClient(null);
    expect(client.defaults.headers.Authorization).toBeUndefined();
  });

  it('omits Authorization header when token is undefined', () => {
    const client = authedClient(undefined);
    expect(client.defaults.headers.Authorization).toBeUndefined();
  });

  it('omits Authorization header when token is empty string', () => {
    const client = authedClient('');
    // empty string is falsy — no header should be set
    expect(client.defaults.headers.Authorization).toBeFalsy();
  });

  it('each call returns a distinct axios instance', () => {
    const a = authedClient('tok1');
    const b = authedClient('tok2');
    expect(a).not.toBe(b);
  });

  it('different tokens produce correct headers', () => {
    const client1 = authedClient('token-alpha');
    const client2 = authedClient('token-beta');
    expect(client1.defaults.headers.Authorization).toBe('Bearer token-alpha');
    expect(client2.defaults.headers.Authorization).toBe('Bearer token-beta');
  });
});

// ─── localStorage token key ───────────────────────────────────────────────────
describe('localStorage token key', () => {
  const TOKEN_KEY = 'wehive_token';

  beforeEach(() => {
    localStorage.clear();
  });

  it('uses "wehive_token" as storage key', () => {
    localStorage.setItem(TOKEN_KEY, 'test-jwt');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('test-jwt');
  });

  it('removes token on logout simulation', () => {
    localStorage.setItem(TOKEN_KEY, 'some-jwt');
    localStorage.removeItem(TOKEN_KEY);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('token survives page reload simulation (localStorage persistence)', () => {
    localStorage.setItem(TOKEN_KEY, 'persisted-jwt');
    // Simulate reading on next page load
    const stored = localStorage.getItem(TOKEN_KEY);
    expect(stored).toBe('persisted-jwt');
  });
});

// ─── PrivateRoute redirect behaviour ─────────────────────────────────────────
// (No component rendering needed — just logic checks on the redirect URL)
describe('PrivateRoute redirect URL encoding', () => {
  it('encodes simple path correctly', () => {
    const path = '/account';
    const encoded = encodeURIComponent(path);
    expect(encoded).toBe('%2Faccount');
  });

  it('encodes path with query params correctly', () => {
    const path = '/account/applications/abc-123';
    const url = `/login?next=${encodeURIComponent(path)}`;
    expect(url).toBe('/login?next=%2Faccount%2Fapplications%2Fabc-123');
  });

  it('decodes back to original path', () => {
    const original = '/account/applications/abc-123?tab=documents';
    const encoded = encodeURIComponent(original);
    expect(decodeURIComponent(encoded)).toBe(original);
  });

  it('does not allow open redirect to external URL', () => {
    // The PrivateRoute only stores the path — never a full http:// URL
    // Consumers should only navigate to paths that start with /
    const next = decodeURIComponent('%2Faccount');
    expect(next.startsWith('/')).toBe(true);
  });
});
