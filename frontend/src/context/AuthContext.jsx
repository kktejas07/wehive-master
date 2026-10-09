import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

import { API } from '../lib/apiBase';

export { API };

const TOKEN_KEY = 'wehive_token';

const AuthCtx = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data);
    } catch (e) {
      // Only an auth rejection invalidates the session; keep the token on
      // network / 5xx errors so a transient outage doesn't log the user out.
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const loginWithPassword = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: u } = res.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(u);
    return res.data;
  }, []);

  const sendOtp = useCallback(async ({ identifier, channel = 'email', purpose = 'login' }) => {
    const res = await axios.post(`${API}/auth/send-otp`, { identifier, channel, purpose });
    return res.data;
  }, []);

  const verifyOtp = useCallback(async ({ identifier, code, channel = 'email', name, referral_code }) => {
    const res = await axios.post(`${API}/auth/verify-otp`, {
      identifier, code, channel, name: name || '', referral_code: referral_code || '',
    });
    const { access_token, user: u } = res.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(u);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) await fetchMe(token);
  }, [token, fetchMe]);

  // Lets other auth providers (e.g. FirebaseAuthContext, which handles Google/email
  // sign-in) hand a freshly-issued backend token to this context directly, instead of
  // writing to localStorage and leaving this context's live state stale until reload.
  const setAuthToken = useCallback((newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthed: !!user,
    loginWithPassword,
    sendOtp,
    verifyOtp,
    logout,
    refreshUser,
    setAuthToken,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function authedClient(token) {
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
