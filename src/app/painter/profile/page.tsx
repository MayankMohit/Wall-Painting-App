'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useProfileData } from '@/hooks/useProfileData';
import { useEmailVerify } from '@/hooks/useEmailVerify';
import { useEmailChange } from '@/hooks/useEmailChange';
import { AvatarCard } from '@/components/profile/AvatarCard';
import { PersonalInfoCard } from '@/components/profile/PersonalInfoCard';
import { SecurityCard } from '@/components/profile/SecurityCard';
import { PainterNotifications } from '@/components/profile/PainterNotifications';
import { SectionHdr } from '@/components/profile/SectionHdr';
import { AlertIco } from '@/components/profile/icons';

export default function PainterProfilePage() {
  const { user, checkAuth, logout } = useAuthStore();
  const router = useRouter();

  const profile = useProfileData(user);
  const verify  = useEmailVerify(checkAuth);
  const change  = useEmailChange(checkAuth);

  const emailVerified = (user?.emailVerified || verify.success) ?? false;
  const displayEmail  = profile.profileData?.email || user?.email || '';

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

      {/* ── Mobile TopBar ──────────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-10 bg-(--paper) border-b border-(--border) px-4 py-2.5 flex items-center justify-between">
        <div className="text-[22px] font-bold tracking-[-0.02em] text-(--ink)">Me</div>
        {!profile.isEditing ? (
          <button onClick={() => profile.setIsEditing(true)} className="text-[13px] font-semibold text-(--accent-deep) bg-transparent border-0 cursor-pointer py-1 px-0.5">
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button onClick={profile.cancelEdit} disabled={profile.isSaving} className="text-[13px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer disabled:opacity-50">Cancel</button>
            <button onClick={profile.handleSave} disabled={profile.isSaving} className="text-[13px] font-semibold text-(--ink) bg-transparent border-0 cursor-pointer disabled:opacity-50">
              {profile.isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop Header ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between max-w-[660px] mx-auto px-8 pt-11 pb-6">
        <div className="text-[26px] font-bold tracking-[-0.025em] text-(--ink)">Me</div>
        {!profile.isEditing ? (
          <button onClick={() => profile.setIsEditing(true)} className="h-9 px-4 rounded-full border border-(--border-2) bg-transparent text-(--ink) text-[13px] font-semibold cursor-pointer">
            Edit profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={profile.cancelEdit} disabled={profile.isSaving} className="h-9 px-4 text-[13px] font-medium text-(--ink-3) bg-transparent border-0 cursor-pointer disabled:opacity-50">Cancel</button>
            <button onClick={profile.handleSave} disabled={profile.isSaving} className="h-9 px-5 rounded-full bg-(--ink) text-white text-[13px] font-semibold border-0 cursor-pointer disabled:opacity-50">
              {profile.isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="pb-10 lg:max-w-[660px] lg:mx-auto">

        {/* Avatar card */}
        <div className="px-4 lg:px-8">
          <AvatarCard
            name={profile.profileData?.name || user?.name || ''}
            email={displayEmail}
            emailVerified={emailVerified}
            stats={profile.profileData?.stats ?? { accepted: 0, pending: 0 }}
          />
        </div>

        {/* Verify email banner */}
        {!emailVerified && !verify.sessionId && change.mode === 'idle' && (
          <div className="px-4 lg:px-8 pt-3">
            <div className="bg-(--surface) border border-(--accent) rounded-(--r-md) p-3.5 flex items-center gap-3">
              <div className="shrink-0 rounded-[10px] bg-(--accent-soft) text-(--accent-deep) flex items-center justify-center" style={{ width: 40, height: 40 }}>
                <AlertIco size={20} weight={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-(--ink)">Verify your email</div>
                <div className="text-[12px] text-(--ink-3) mt-0.5 leading-[1.4] truncate">
                  Confirm {displayEmail} to receive job updates.
                </div>
              </div>
              <button onClick={verify.sendOtp} disabled={verify.sending} className="shrink-0 h-8 px-3.5 rounded-full bg-(--accent) text-white text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-50">
                {verify.sending ? '…' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {/* Personal info */}
        <SectionHdr title="Personal info" />
        <div className="px-4 lg:px-8">
          <PersonalInfoCard
            name={profile.profileData?.name}
            phone={profile.profileData?.phone}
            joined={profile.profileData?.joined}
            isEditing={profile.isEditing}
            isSaving={profile.isSaving}
            editName={profile.editName}
            onEditName={profile.setEditName}
            emailVerified={emailVerified}
            displayEmail={displayEmail}
            verify={verify}
            change={change}
          />
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
