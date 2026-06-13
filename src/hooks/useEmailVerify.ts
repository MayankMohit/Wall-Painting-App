import { useState } from 'react';
import { apiPost, errMsg } from '@/lib/profileApi';

export function useEmailVerify(onSuccess: () => void) {
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [sending, setSending]       = useState(false);
  const [otp, setOtp]               = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  const sendOtp = async () => {
    setError(null); setSending(true);
    try {
      const { ok, data } = await apiPost('/api/users/verify-email/send', {});
      if (!ok) { setError(errMsg(data, 'Failed to send code')); return; }
      setSessionId(data.sessionId);
    } catch { setError('Network error'); }
    finally   { setSending(false); }
  };

  const confirmOtp = async (code: string) => {
    if (!sessionId) return;
    setConfirming(true); setError(null);
    try {
      const { ok, data } = await apiPost('/api/users/verify-email/confirm', { sessionId, otp: code });
      if (!ok) { setError(errMsg(data, 'Invalid code')); setOtp(''); return; }
      setSuccess(true); onSuccess();
    } catch { setError('Network error'); }
    finally   { setConfirming(false); }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) confirmOtp(val);
  };

  return { sessionId, sending, otp, confirming, error, success, sendOtp, handleOtpChange };
}

export type EmailVerifyState = ReturnType<typeof useEmailVerify>;
