'use client';
import { useState } from 'react';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  type NotificationPrefs,
} from '@/store/api/notificationsApi';
import { useAuthStore } from '@/store/authStore';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function NotificationPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: prefs, isLoading } = useGetPreferencesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [updatePreferences, { isLoading: isSaving }] = useUpdatePreferencesMutation();

  // Local toggle for quiet-hours section visibility when no QH is set yet
  const [quietEnabled, setQuietEnabled] = useState(false);

  if (!isAuthenticated || isLoading || !prefs) return null;

  const pushEnabled  = prefs.push['*']  ?? true;
  const emailEnabled = prefs.email['*'] ?? true;
  const qh           = prefs.quietHours;
  const showQH       = qh !== null || quietEnabled;

  function save(patch: Partial<NotificationPrefs>) {
    updatePreferences(patch);
  }

  return (
    <div className="space-y-6">
      {/* Channels */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Channels</h3>
        <div className="space-y-3">
          <Toggle
            label="Push notifications"
            checked={pushEnabled}
            onChange={(v) => save({ push: { '*': v } })}
          />
          <Toggle
            label="Email notifications"
            checked={emailEnabled}
            onChange={(v) => save({ email: { '*': v } })}
          />
          <Toggle
            label="Daily digest email"
            checked={prefs.digest}
            onChange={(v) => save({ digest: v })}
          />
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Quiet hours</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Silence normal notifications during these hours
            </p>
          </div>
          <Toggle
            label=""
            checked={showQH}
            onChange={(v) => {
              setQuietEnabled(v);
              if (!v) save({ quietHours: null });
            }}
          />
        </div>

        {showQH && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="time"
                defaultValue={qh?.start ?? '22:00'}
                onChange={(e) =>
                  save({
                    quietHours: {
                      start: e.target.value,
                      end:   qh?.end ?? '08:00',
                      tz:    qh?.tz  ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                  })
                }
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Until</label>
              <input
                type="time"
                defaultValue={qh?.end ?? '08:00'}
                onChange={(e) =>
                  save({
                    quietHours: {
                      start: qh?.start ?? '22:00',
                      end:   e.target.value,
                      tz:    qh?.tz    ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
                  })
                }
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="col-span-2 text-xs text-gray-400">
              Timezone: {qh?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
          </div>
        )}
      </div>

      {isSaving && <p className="text-xs text-gray-400">Saving…</p>}
    </div>
  );
}
