'use client';

import { useState } from 'react';
import { ChevRight, ChevDown, EyeOff } from './icons';

const FIELD_CLS = 'h-11 bg-(--paper-2) border border-(--border-2) rounded-(--r) px-3 flex items-center gap-2';

export function SecurityCard() {
  const [open, setOpen]           = useState(false);
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  const toggle = () => {
    setOpen((o) => !o);
    setError(null); setSuccess(false); setNewPw(''); setConfirmPw('');
  };

  const handleSave = async () => {
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 8)   { setError('At least 8 characters required'); return; }
    setError(null); setSaving(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? json.error ?? 'Failed'); return; }
      setSuccess(true); setNewPw(''); setConfirmPw('');
    } catch { setError('Network error'); }
    finally   { setSaving(false); }
  };

  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
      <button
        onClick={toggle}
        className="w-full px-3.5 py-3.5 flex items-center gap-3 bg-transparent border-0 cursor-pointer text-left"
      >
        <div className="flex-1">
          <div className="text-[14px] font-medium text-(--ink)">Password</div>
          <div className="text-[11px] text-(--ink-3) mt-px">Change your account password</div>
        </div>
        {open
          ? <ChevDown size={18} weight={1.8} style={{ color: 'var(--ink-4)' }} />
          : <ChevRight size={18} weight={1.8} style={{ color: 'var(--ink-4)' }} />
        }
      </button>

      {open && (
        <div className="px-3.5 pb-4 space-y-2.5">
          {success ? (
            <div className="py-2 text-[13px] font-medium text-(--approved)">Password updated successfully.</div>
          ) : (
            <>
              <div>
                <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">New password</div>
                <div className={FIELD_CLS}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    disabled={saving}
                    placeholder="At least 8 characters"
                    className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="text-(--ink-3) bg-transparent border-0 cursor-pointer shrink-0">
                    <EyeOff size={16} weight={1.6} />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">Confirm new password</div>
                <div className={[FIELD_CLS, confirmPw && confirmPw !== newPw ? 'border-(--rejected)' : ''].join(' ')}>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    disabled={saving}
                    placeholder="Repeat new password"
                    className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
                  />
                </div>
              </div>
              {error && <div className="text-[11px] text-(--rejected)">{error}</div>}
              <button
                onClick={handleSave}
                disabled={saving || !newPw || !confirmPw}
                className="w-full h-10 rounded-(--r) bg-(--ink) text-white text-[13px] font-semibold border-0 cursor-pointer disabled:opacity-40"
              >
                {saving ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
