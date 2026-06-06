'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  type NotificationPrefs,
} from '@/store/api/notificationsApi';
import { Toggle } from '@/components/ui/Toggle';

const INPUT_CLS = 'w-full h-10 rounded-(--r) border border-(--border-2) bg-(--paper-2) px-3 text-[13px] text-(--ink) font-(--mono) focus:outline-none focus:border-(--border-3)';

export function PainterNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: prefs, isLoading } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });
  const [updatePreferences, { isLoading: isSaving }] = useUpdatePreferencesMutation();

  const [quietEnabled, setQuietEnabled] = useState(false);
  const qhStartFromPrefs = prefs?.quietHours?.start;
  const qhEndFromPrefs   = prefs?.quietHours?.end;
  const [qhStart, setQhStart] = useState(qhStartFromPrefs ?? '22:00');
  const [qhEnd,   setQhEnd]   = useState(qhEndFromPrefs   ?? '08:00');

  useEffect(() => { if (qhStartFromPrefs) setQhStart(qhStartFromPrefs); }, [qhStartFromPrefs]);
  useEffect(() => { if (qhEndFromPrefs)   setQhEnd(qhEndFromPrefs);     }, [qhEndFromPrefs]);

  if (!isAuthenticated || isLoading || !prefs) return null;

  const pushEnabled  = prefs.push['*']  ?? true;
  const emailEnabled = prefs.email['*'] ?? true;
  const qh           = prefs.quietHours;
  const showQH       = qh !== null || quietEnabled;

  function save(patch: Partial<NotificationPrefs>) { updatePreferences(patch); }

  return (
    <div className="bg-(--surface) border border-(--border) rounded-(--r-md) overflow-hidden">
      <div className="px-3.5 py-3 flex items-center gap-3 border-b border-(--border)">
        <div className="flex-1">
          <div className="text-[14px] font-medium text-(--ink)">Push notifications</div>
          <div className="text-[11px] text-(--ink-3) mt-px">On-device alerts for job activity</div>
        </div>
        <Toggle checked={pushEnabled} onChange={(v) => save({ push: { '*': v } })} disabled={isSaving} />
      </div>

      <div className="px-3.5 py-3 flex items-center gap-3 border-b border-(--border)">
        <div className="flex-1">
          <div className="text-[14px] font-medium text-(--ink)">Email notifications</div>
          <div className="text-[11px] text-(--ink-3) mt-px">Updates sent to your email address</div>
        </div>
        <Toggle checked={emailEnabled} onChange={(v) => save({ email: { '*': v } })} disabled={isSaving} />
      </div>

      <div className="px-3.5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[14px] font-medium text-(--ink)">Quiet hours</div>
            <div className="text-[11px] text-(--ink-3) mt-px">Silence notifications during these hours</div>
          </div>
          <Toggle
            checked={showQH}
            disabled={isSaving}
            onChange={(v) => {
              setQuietEnabled(v);
              if (v && !qh) {
                save({ quietHours: { start: qhStart, end: qhEnd, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
              } else if (!v) {
                save({ quietHours: null });
              }
            }}
          />
        </div>

        {showQH && (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">From</div>
              <input type="time" value={qhStart} className={INPUT_CLS}
                onChange={(e) => {
                  setQhStart(e.target.value);
                  save({ quietHours: { start: e.target.value, end: qhEnd, tz: qh?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone } });
                }}
              />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-(--ink-3) mb-1.5">Until</div>
              <input type="time" value={qhEnd} className={INPUT_CLS}
                onChange={(e) => {
                  setQhEnd(e.target.value);
                  save({ quietHours: { start: qhStart, end: e.target.value, tz: qh?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone } });
                }}
              />
            </div>
            <div className="col-span-2 text-[11px] text-(--ink-4)">
              Timezone: {qh?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
