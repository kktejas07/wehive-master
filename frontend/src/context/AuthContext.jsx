import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
export const API = `${BACKEND_URL}/api`;

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
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.data);
    } catch (_e) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
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

  const openAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const value = {
    user,
    token,
    loading,
    isAuthed: !!user,
    sendOtp,
    verifyOtp,
    logout,
    refreshUser,
    authOpen,
    authMode,
    openAuth,
    closeAuth,
    setAuthMode,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function authedClient(token) {
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
