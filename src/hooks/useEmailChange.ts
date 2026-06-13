import { useState } from 'react';
import { apiPost, errMsg } from '@/lib/profileApi';

export type ChangeMode = 'idle' | 'form' | 'otp';

export function useEmailChange(onSuccess: () => void) {
  const [mode, setMode]                 = useState<ChangeMode>('idle');
  const [newEmail, setNewEmail]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending]           = useState(false);
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [otp, setOtp]                   = useState('');
  const [confirming, setConfirming]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);

  const open   = () => { setMode('form'); setError(null); setNewEmail(''); setPassword(''); };
  const cancel = () => { setMode('idle'); setSessionId(null); setOtp(''); setError(null); };

  const sendOtp = async () => {
    setError(null); setSending(true);
    try {
      const { ok, data } = await apiPost('/api/users/change-email/send', { newEmail, password });
      if (!ok) { setError(errMsg(data, 'Failed to send code')); return; }
      setSessionId(data.sessionId); setMode('otp');
    } catch { setError('Network error'); }
    finally   { setSending(false); }
  };

  const confirmOtp = async (code: string) => {
    if (!sessionId) return;
    setConfirming(true); setError(null);
    try {
      const { ok, data } = await apiPost('/api/users/change-email/confirm', { sessionId, otp: code });
      if (!ok) { setError(errMsg(data, 'Invalid code')); setOtp(''); return; }
      setSuccess(true); setMode('idle'); onSuccess();
    } catch { setError('Network error'); }
    finally   { setConfirming(false); }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) confirmOtp(val);
  };

  const backToForm = () => { setMode('form'); setSessionId(null); setOtp(''); setError(null); };

  return {
    mode, newEmail, setNewEmail, password, setPassword, showPassword, setShowPassword,
    sending, otp, confirming, error, success,
    open, cancel, sendOtp, handleOtpChange, backToForm,
  };
}

export type EmailChangeState = ReturnType<typeof useEmailChange>;
