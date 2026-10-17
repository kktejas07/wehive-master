import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API } from './AuthContext';
import { handleAdminAuthError, setAdminUnauthorizedHandler } from '../lib/admin';

const TOKEN_KEY = 'wehive_admin_token';
const AdminAuthCtx = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export const ADMIN_API = `${API}/admin-auth`;

export function adminAuthedClient(token) {
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(!!token);

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await axios.get(`${ADMIN_API}/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setAdmin(res.data);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchMe(token);
    else setLoading(false);
  }, [token, fetchMe]);

  // Store a session. A response with `mfa_required` is only a ticket for the 2FA step and is not stored.
  const adopt = useCallback((data) => {
    if (!data?.access_token) return data;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    if (data.user) setAdmin(data.user);
    return data;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await axios.post(`${ADMIN_API}/login`, { email, password });
    return adopt(data);
  }, [adopt]);

  const verifyTwoFactor = useCallback(async ({ mfaToken, code }) => {
    const { data } = await axios.post(`${ADMIN_API}/login/2fa`, { mfa_token: mfaToken, code });
    return adopt(data);
  }, [adopt]);

  const signup = useCallback(async ({ email, password, name, bootstrapToken }) => {
    const { data } = await axios.post(`${ADMIN_API}/signup`, { email, password, name, bootstrap_token: bootstrapToken || undefined });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setAdmin(data.user);
    return data;
  }, []);

  const forgotPassword = useCallback(async ({ email }) => {
    const { data } = await axios.post(`${ADMIN_API}/forgot-password`, { email });
    return data;
  }, []);

  const resetPassword = useCallback(async ({ token: raw, new_password }) => {
    const { data } = await axios.post(`${ADMIN_API}/reset-password`, { token: raw, new_password });
    return adopt(data);
  }, [adopt]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  // Central 401 handling: tabs call either adminClient()/apiClient() (interceptor built in)
  // or the global axios with the admin bearer token, so watch both.
  useEffect(() => {
    setAdminUnauthorizedHandler(logout);
    const id = axios.interceptors.response.use(undefined, handleAdminAuthError);
    return () => {
      setAdminUnauthorizedHandler(null);
      axios.interceptors.response.eject(id);
    };
  }, [logout]);

  const refresh = useCallback(async () => {
    if (token) await fetchMe(token);
  }, [token, fetchMe]);

  const value = {
    admin,
    token,
    loading,
    isAuthed: !!admin,
    login,
    verifyTwoFactor,
    adopt,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    refresh,
  };

  return <AdminAuthCtx.Provider value={value}>{children}</AdminAuthCtx.Provider>;
}
