import axios from 'axios';
import { API } from '../../../lib/apiBase';

export async function getCurrentUser(token: string) {
  const r = await axios.get(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.data;
}

export async function loginWithPassword(email: string, password: string) {
  const r = await axios.post(`${API}/auth/login`, { email, password });
  return r.data as { access_token: string; refresh_token: string; user: unknown };
}

export async function sendOtp(identifier: string, channel: string, purpose: string) {
  const r = await axios.post(`${API}/auth/send-otp`, { identifier, channel, purpose });
  return r.data;
}

export async function verifyOtp(
  identifier: string,
  code: string,
  channel: string,
  purpose: string,
  referralCode?: string
) {
  const r = await axios.post(`${API}/auth/verify-otp`, {
    identifier,
    code,
    channel,
    purpose,
    referral_code: referralCode,
  });
  return r.data as { access_token: string; refresh_token: string; user: unknown; is_new?: boolean };
}

export async function refreshToken(token: string) {
  const r = await axios.post(`${API}/auth/refresh`, { refresh_token: token });
  return r.data as { access_token: string };
}

export async function adminLogin(email: string, password: string) {
  const r = await axios.post(`${API}/admin-auth/login`, { email, password });
  return r.data;
}
