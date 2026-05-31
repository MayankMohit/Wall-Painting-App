'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { registerFCM, setupFCMForeground } from '@/lib/firebase-fcm';
import { notificationsApi } from '@/store/api/notificationsApi';
import { useAppDispatch } from '@/store/hooks';

export function useFCM() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerFCM().catch(() => {});

    // Foreground push — invalidate the bell cache so it refreshes
    const unsubscribe = setupFCMForeground(() => {
      dispatch(notificationsApi.util.invalidateTags(['Notification']));
    });

    return unsubscribe;
  }, [isAuthenticated, dispatch]);
}
