'use client';

import { OtpInput } from '@/components/ui/OtpInput';
import { Pill } from './Pill';
import { EyeOff } from './icons';
import type { EmailVerifyState } from '@/hooks/useEmailVerify';
import type { EmailChangeState } from '@/hooks/useEmailChange';

interface PersonalInfoCardProps {
  name: string | undefined;
  phone: string | undefined;
  joined: string | undefined;
  isEditing: boolean;
  isSaving: boolean;
  editName: string;
  onEditName: (v: string) => void;
  emailVerified: boolean;
  displayEmail: string;
  verify: EmailVerifyState;
  change: EmailChangeState;
}

export function PersonalInfoCard({
  name, phone, joined,
  isEditing, isSaving, editName, onEditName,
  emailVerified, displayEmail,
  verify, change,
}: PersonalInfoCardProps) {
  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">

      {/* Full name */}
      <div className="px-3.5 py-3 flex items-center gap-3 border-b border-(--border)">
        <div className="text-[13px] text-(--ink-3) w-24 shrink-0">Full name</div>
        {isEditing ? (
          <input
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            disabled={isSaving}
            placeholder="Full name"
            className="flex-1 text-[13px] font-semibold text-(--ink) text-right bg-(--paper-2) border border-(--border-2) rounded-(--r-sm) px-2 py-1 focus:outline-none"
          />
        ) : (
          <div className="flex-1 text-[13px] font-semibold text-(--ink) text-right">{name}</div>
        )}
      </div>

      {/* Email */}
      <div className="px-3.5 py-3 border-b border-(--border)">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="text-[13px] text-(--ink-3) flex-1">Email</div>
          {!emailVerified && <Pill kind="pending">Unverified</Pill>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-semibold text-(--ink) flex-1 min-w-0 truncate">{displayEmail}</div>
          {change.mode === 'idle' && (
            <div className="flex items-center gap-2 shrink-0">
              {!emailVerified && !verify.sessionId && (
                <>
                  <button
                    onClick={verify.sendOtp}
                    disabled={verify.sending}
                    className="text-[13px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer disabled:opacity-50"
                  >
                    {verify.sending ? '…' : 'Verify'}
                  </button>
                  <span className="text-(--border-3)">·</span>
                </>
              )}
              <button onClick={change.open} className="text-[13px] font-semibold text-(--ink-2) bg-transparent border-0 cursor-pointer">
                Change
              </button>
            </div>
          )}
          {change.mode !== 'idle' && (
            <button onClick={change.cancel} className="text-[13px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer shrink-0">
              Cancel
            </button>
          )}
        </div>

        {/* Verify OTP */}
        {verify.sessionId && !verify.success && (
          <div className="mt-3 space-y-2">
            <div className="text-[12px] text-(--ink-3) leading-[1.4]">
              Enter the 6-digit code sent to <span className="font-semibold text-(--ink)">{displayEmail}</span>
            </div>
            <OtpInput
              value={verify.otp}
              onChange={verify.handleOtpChange}
              disabled={verify.confirming}
              error={verify.error}
              placeholder={verify.confirming ? 'Verifying…' : 'Enter 6-digit code'}
            />
            <button
              onClick={verify.sendOtp}
              disabled={verify.sending}
              className="text-[12px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer disabled:opacity-50"
            >
              {verify.sending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        )}

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
              Enter the 6-digit code sent to <span className="font-semibold text-(--ink)">{change.newEmail}</span>
            </div>
            <OtpInput
              value={change.otp}
              onChange={change.handleOtpChange}
              disabled={change.confirming}
              error={change.error}
              placeholder={change.confirming ? 'Verifying…' : 'Enter 6-digit code'}
            />
            <div className="flex items-center justify-between">
              <button onClick={change.backToForm} className="text-[12px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer">
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

        {verify.success && <div className="mt-2 text-[12px] font-medium text-(--approved)">Email verified successfully.</div>}
        {change.success && <div className="mt-2 text-[12px] font-medium text-(--approved)">Email updated successfully.</div>}
      </div>

      {/* Phone */}
      <div className="px-3.5 py-3 flex items-center gap-3 border-b border-(--border)">
        <div className="text-[13px] text-(--ink-3) w-24 shrink-0">Phone</div>
        <div className="flex-1 text-[13px] font-semibold text-(--ink) text-right">{phone || '—'}</div>
      </div>

      {/* Joined */}
      <div className="px-3.5 py-3 flex items-center gap-3">
        <div className="text-[13px] text-(--ink-3) w-24 shrink-0">Joined</div>
        <div className="flex-1 text-[13px] font-semibold text-(--ink) text-right">{joined ?? '—'}</div>
      </div>
    </div>
  );
}
