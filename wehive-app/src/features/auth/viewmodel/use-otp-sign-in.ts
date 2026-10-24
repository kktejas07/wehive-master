import { useState } from 'react';

import { ApiError } from '@/core/api/client';
import { useSession } from '@/core/auth/session';
import { authApi, isValidIdentifier, normaliseIdentifier } from '@/features/auth/model/auth-api';

type Step = 'identifier' | 'code' | 'done';

/** ViewModel: sign in with a one-time code sent to email or WhatsApp. No UI here. */
export function useOtpSignIn() {
  const { signIn } = useSession();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = isValidIdentifier(identifier) && !busy;
  const canVerify = code.trim().length >= 4 && !busy;

  async function sendCode() {
    if (!isValidIdentifier(identifier)) {
      setError('Enter a valid email address or mobile number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.sendOtp(normaliseIdentifier(identifier));
      setMasked(r.masked);
      setDevCode(r.dev_code ?? null);
      setStep('code');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the code. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.verifyOtp(normaliseIdentifier(identifier), code.trim());
      await signIn(r.access_token, r.user);
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not verify the code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function changeIdentifier() {
    setStep('identifier');
    setCode('');
    setError(null);
  }

  return {
    step, identifier, setIdentifier, code, setCode, masked, devCode, busy, error,
    canSend, canVerify, sendCode, verify, changeIdentifier,
  };
}
