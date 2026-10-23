import { api } from '@/core/api/client';

import { channelFor } from './identifier';

/** Model: the signed-in user as the backend returns it (PublicUser). */
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  is_premium?: boolean;
  plan_id?: string | null;
  premium_free_left?: number;
  pending_email?: string | null;
  pending_phone?: string | null;
  created_at?: string;
}

export interface SendOtpResult {
  sent: boolean;
  channel: string;
  masked: string;
  dev_code?: string | null;
  ttl_seconds: number;
}

export { channelFor, isValidIdentifier, normaliseIdentifier, type Channel } from './identifier';

export const authApi = {
  sendOtp: (identifier: string) =>
    api<SendOtpResult>('/auth/send-otp', {
      method: 'POST',
      body: { identifier, channel: channelFor(identifier), purpose: 'login' },
    }),
  verifyOtp: (identifier: string, code: string, name?: string) =>
    api<{ access_token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: { identifier, code, channel: channelFor(identifier), name: name || undefined },
    }),
  me: () => api<User>('/auth/me'),
};
