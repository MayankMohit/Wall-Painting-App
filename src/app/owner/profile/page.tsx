'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useEmailChange } from '@/hooks/useEmailChange';
import { SecurityCard } from '@/components/profile/SecurityCard';
import { PainterNotifications } from '@/components/profile/PainterNotifications';
import { SectionHdr } from '@/components/profile/SectionHdr';
import { Pill } from '@/components/profile/Pill';
import { EyeOff } from '@/components/profile/icons';
import { OtpInput } from '@/components/ui/OtpInput';

// ── Profile data hook ──────────────────────────────────────────────────────

interface OwnerProfileData {
  name: string;
  email: string;
  phone: string;
  joined: string;
}

function useOwnerProfile(user: { name?: string; email?: string } | null) {
  const [data, setData]       = useState<OwnerProfileData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [editName, setEditName]   = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('No token');
        const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load profile');
        const json = await res.json();
        const d = json?.data ?? json;
        if (!mounted) return;
        const profile: OwnerProfileData = {
          name:   d.name  || user.name  || '',
          email:  d.email || user.email || '',
          phone:  d.phone || '',
          joined: d.createdAt
            ? new Date(d.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
            : '—',
        };
        setData(profile);
        setEditName(profile.name);
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update');
      setData((p) => p ? { ...p, name: editName } : p);
      setIsEditing(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (data) setEditName(data.name);
  };

  return {
    data, isLoading, error,
    isEditing, setIsEditing, isSaving,
    editName, setEditName,
    handleSave, cancelEdit,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function OwnerProfilePage() {
  const { user, checkAuth, logout } = useAuthStore();
  const router = useRouter();

  const profile = useOwnerProfile(user);
  const change  = useEmailChange(checkAuth);

  const displayEmail = profile.data?.email || user?.email || '';

  if (profile.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="landing-spinner" />
      </div>
    );
  }

  if (profile.error) {
    return (
      <div className="m-6 p-4 rounded-(--r) bg-(--rejected-soft) text-(--rejected) text-[13px] font-medium border border-[oklch(0.55_0.17_25_/_0.2)]">
        {profile.error}
      </div>
    );
  }

  return (
    <div className="bg-(--paper) min-h-svh">

      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-10 bg-(--paper) border-b border-(--border) px-4 py-2.5 flex items-center justify-between">
        <div className="text-[22px] font-bold tracking-[-0.02em] text-(--ink)">Me</div>
        {!profile.isEditing ? (
          <button
            onClick={() => profile.setIsEditing(true)}
            className="text-[13px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer py-1 px-0.5"
          >
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={profile.cancelEdit}
              disabled={profile.isSaving}
              className="text-[13px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={profile.handleSave}
              disabled={profile.isSaving}
              className="text-[13px] font-semibold text-(--ink) bg-transparent border-0 cursor-pointer disabled:opacity-50"
            >
              {profile.isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop header ──────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between max-w-[660px] mx-auto px-8 pt-11 pb-6">
        <div className="text-[26px] font-bold tracking-[-0.025em] text-(--ink)">Me</div>
        {!profile.isEditing ? (
          <button
            onClick={() => profile.setIsEditing(true)}
            className="h-9 px-4 rounded-full border border-(--border-2) bg-transparent text-(--ink) text-[13px] font-semibold cursor-pointer"
          >
            Edit profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={profile.cancelEdit}
              disabled={profile.isSaving}
              className="h-9 px-4 text-[13px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={profile.handleSave}
              disabled={profile.isSaving}
              className="h-9 px-5 rounded-full bg-(--ink) text-white text-[13px] font-semibold border-0 cursor-pointer disabled:opacity-50"
            >
              {profile.isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="pb-10 lg:max-w-[660px] lg:mx-auto">

        {/* Avatar card */}
        <div className="px-4 lg:px-8">
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) p-4">
            <div className="flex items-center gap-4">
              <div
                className="shrink-0 rounded-full bg-(--ink) text-white flex items-center justify-center text-[22px] font-bold select-none"
                style={{ width: 56, height: 56 }}
              >
                {(profile.data?.name || user?.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[17px] font-semibold text-(--ink) truncate leading-snug">
                  {profile.data?.name || user?.name}
                </div>
                <div className="text-[12px] text-(--ink-3) mt-0.5 truncate">{displayEmail}</div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Pill kind="neutral">Owner</Pill>
                  <Pill kind="approved">Verified</Pill>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal info */}
        <SectionHdr title="Personal info" />
        <div className="px-4 lg:px-8">
          <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">

            {/* Full name */}
            <div className="px-3.5 py-3 flex items-center gap-3 border-b border-(--border)">
              <div className="text-[13px] text-(--ink-3) w-24 shrink-0">Full name</div>
              {profile.isEditing ? (
                <input
                  value={profile.editName}
                  onChange={(e) => profile.setEditName(e.target.value)}
                  disabled={profile.isSaving}
                  placeholder="Full name"
                  className="flex-1 text-[13px] font-semibold text-(--ink) text-right bg-(--paper-2) border border-(--border-2) rounded-(--r-sm) px-2 py-1 focus:outline-none"
                />
              ) : (
                <div className="flex-1 text-[13px] font-semibold text-(--ink) text-right">
                  {profile.data?.name}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="px-3.5 py-3 border-b border-(--border)">
              <div className="flex items-center gap-2">
                <div className="text-[13px] text-(--ink-3) flex-1">Email</div>
                {change.mode === 'idle' && (
                  <button
                    onClick={change.open}
                    className="text-[13px] font-semibold text-(--ink-2) bg-transparent border-0 cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                )}
                {change.mode !== 'idle' && (
                  <button
                    onClick={change.cancel}
                    className="text-[13px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="text-[13px] font-semibold text-(--ink) mt-0.5 truncate">{displayEmail}</div>

              {/* Change email — form */}
              {change.mode === 'form' && (
                <div className="mt-3 space-y-2.5">
                  <div>
                    <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">New email address</div>
                    <div className="h-11 bg-(--paper-2) border border-(--border-2) rounded-(--r) px-3 flex items-center">
                      <input
                        type="email"
                        value={change.newEmail}
                        onChange={(e) => change.setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">Current password</div>
                    <div className="h-11 bg-(--paper-2) border border-(--border-2) rounded-(--r) px-3 flex items-center gap-2">
                      <input
                        type={change.showPassword ? 'text' : 'password'}
                        value={change.password}
                        onChange={(e) => change.setPassword(e.target.value)}
                        placeholder="Confirm it's you"
                        className="flex-1 bg-transparent border-0 outline-none text-[14px] text-(--ink) placeholder:text-(--ink-4)"
                      />
                      <button
                        type="button"
                        onClick={() => change.setShowPassword((s) => !s)}
                        className="text-(--ink-3) bg-transparent border-0 cursor-pointer shrink-0"
                      >
                        <EyeOff size={16} weight={1.6} />
                      </button>
                    </div>
                  </div>
                  {change.error && <div className="text-[11px] text-(--rejected)">{change.error}</div>}
                  <button
                    onClick={change.sendOtp}
                    disabled={change.sending || !change.newEmail || !change.password}
                    className="w-full h-10 rounded-(--r) bg-(--ink) text-white text-[13px] font-semibold border-0 cursor-pointer disabled:opacity-40"
                  >
                    {change.sending ? 'Sending code…' : 'Send verification code'}
                  </button>
                </div>
              )}

              {/* Change email — OTP */}
              {change.mode === 'otp' && (
                <div className="mt-3 space-y-2">
                  <div className="text-[12px] text-(--ink-3) leading-[1.4]">
                    Enter the 6-digit code sent to{' '}
                    <span className="font-semibold text-(--ink)">{change.newEmail}</span>
                  </div>
                  <OtpInput
                    value={change.otp}
                    onChange={change.handleOtpChange}
                    disabled={change.confirming}
                    error={change.error}
                    placeholder={change.confirming ? 'Verifying…' : 'Enter 6-digit code'}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={change.backToForm}
                      className="text-[12px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={change.sendOtp}
                      disabled={change.sending}
                      className="text-[12px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer disabled:opacity-50"
                    >
                      {change.sending ? 'Sending…' : 'Resend code'}
                    </button>
                  </div>
                </div>
              )}

              {change.success && (
                <div className="mt-2 text-[12px] font-medium text-(--approved)">
                  Email updated successfully.
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="px-3.5 py-3 flex items-center gap-3 border-b border-(--border)">
              <div className="text-[13px] text-(--ink-3) w-24 shrink-0">Phone</div>
              <div className="flex-1 text-[13px] font-semibold text-(--ink) text-right">
                {profile.data?.phone || '—'}
              </div>
            </div>

            {/* Joined */}
            <div className="px-3.5 py-3 flex items-center gap-3">
              <div className="text-[13px] text-(--ink-3) w-24 shrink-0">Joined</div>
              <div className="flex-1 text-[13px] font-semibold text-(--ink) text-right">
                {profile.data?.joined ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <SectionHdr title="Notifications" />
        <div className="px-4 lg:px-8">
          <PainterNotifications />
        </div>

        {/* Security */}
        <SectionHdr title="Security" />
        <div className="px-4 lg:px-8">
          <SecurityCard />
        </div>

        {/* Sign out */}
        <div className="px-4 lg:px-8 pt-6">
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full h-[52px] rounded-full border border-(--border-2) bg-transparent text-(--rejected) text-[15px] font-semibold cursor-pointer flex items-center justify-center"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
