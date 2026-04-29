import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API } from './AuthContext';

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

  const login = useCallback(async ({ email, password }) => {
    const { data } = await axios.post(`${ADMIN_API}/login`, { email, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setAdmin(data.user);
    return data;
  }, []);

  const signup = useCallback(async ({ email, password, name }) => {
    const { data } = await axios.post(`${ADMIN_API}/signup`, { email, password, name });
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
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setAdmin(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  const refresh = useCallback(async () => {
    if (token) await fetchMe(token);
  }, [token, fetchMe]);

  const value = {
    admin,
    token,
    loading,
    isAuthed: !!admin,
    login,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    refresh,
  };

  return <AdminAuthCtx.Provider value={value}>{children}</AdminAuthCtx.Provider>;
}
