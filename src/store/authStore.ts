import { create } from 'zustand';
import { store } from '@/store/index';
import { api } from '@/store/api/api';
import { notificationsApi } from '@/store/api/notificationsApi';

export interface User {
  id: string;
  name: string;
  email: string | null;   // owner-provisioned painters have no email until they add one
  role: 'painter' | 'owner' | 'admin';
  phone: string;
  emailVerified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  hasPassword?: boolean;   // from /api/users/me — false for owner-provisioned painters who haven't set one
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithEmailOtp: (sessionId: string, otp: string) => Promise<boolean>;
  loginWithInvite: (token: string) => Promise<{ ok: boolean; jobId?: string }>;

  registerUser: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'painter' | 'owner';
    emailOtp?: string;
    emailSessionId?: string;
  }) => Promise<boolean>;

  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

function persistAuth(token: string) {
  localStorage.setItem('wallpainter_token', token);
  // Status hint cookie only (not the bearer token). SameSite=Lax blocks cross-site
  // sends; Secure is added on HTTPS (omitted on http://localhost so dev still works).
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `wallpainter_auth_status=true; path=/; max-age=172800; SameSite=Lax${secure}`;
}

// ── Token refresh scheduling ──────────────────────────────────────────────────

let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

function decodeJwtExp(token: string): number | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

// Schedules a proactive refresh ~1 hour before the token expires.
function scheduleRefresh(token: string, refresh: () => void) {
  clearRefreshTimer();
  const exp = decodeJwtExp(token);
  if (!exp) return;
  const msUntilRefresh = exp * 1000 - Date.now() - 60 * 60 * 1000; // 1 h before expiry
  if (msUntilRefresh <= 0) {
    refresh();
    return;
  }
  _refreshTimer = setTimeout(refresh, msUntilRefresh);
}

async function callApi(url: string, body: unknown): Promise<{ ok: boolean; token?: string; user?: User; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const payload = json.data ?? json;
  const e = payload.error;
  return res.ok
    ? { ok: true, token: payload.token, user: payload.user }
    : { ok: false, error: (typeof e === 'string' ? e : e?.message) ?? payload.message ?? 'Something went wrong' };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await callApi('/api/auth/login', { identifier, password });
      if (!result.ok) {
        set({ error: result.error, isLoading: false });
        return false;
      }
      persistAuth(result.token!);
      scheduleRefresh(result.token!, () => get().refreshToken());
      set({ user: result.user!, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  loginWithEmailOtp: async (sessionId, otp) => {
    set({ isLoading: true, error: null });
    try {
      const result = await callApi('/api/auth/login/otp/verify', { sessionId, otp });
      if (!result.ok) {
        set({ error: result.error, isLoading: false });
        return false;
      }
      persistAuth(result.token!);
      scheduleRefresh(result.token!, () => get().refreshToken());
      set({ user: result.user!, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  loginWithInvite: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      const payload = json.data ?? json;
      if (!res.ok) {
        const e = payload.error;
        set({ error: (typeof e === 'string' ? e : e?.message) ?? 'This link is no longer valid.', isLoading: false });
        return { ok: false };
      }
      persistAuth(payload.token);
      scheduleRefresh(payload.token, () => get().refreshToken());
      set({ user: payload.user, isAuthenticated: true, isLoading: false });
      return { ok: true, jobId: payload.jobId as string | undefined };
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return { ok: false };
    }
  },

  registerUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      // API expects `sessionId`; surface-level interface uses `emailSessionId` for clarity
      const { emailSessionId, ...rest } = userData;
      const apiPayload = emailSessionId ? { ...rest, sessionId: emailSessionId } : rest;
      const result = await callApi('/api/auth/register', apiPayload);
      if (!result.ok) {
        set({ error: result.error, isLoading: false });
        return false;
      }
      persistAuth(result.token!);
      scheduleRefresh(result.token!, () => get().refreshToken());
      set({ user: result.user!, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  logout: () => {
    clearRefreshTimer();
    const token    = localStorage.getItem('wallpainter_token');
    const fcmToken = localStorage.getItem('wallpainter_fcm_token');
    if (token) {
      fetch('/api/auth/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(fcmToken ? { fcmToken } : {}),
      }).catch(() => {});
    }
    localStorage.removeItem('wallpainter_token');
    localStorage.removeItem('wallpainter_fcm_token');
    document.cookie = 'wallpainter_auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    set({ user: null, isAuthenticated: false });
    // Wipe RTK Query cache so the next user never sees stale data from a previous session
    store.dispatch(api.util.resetApiState());
    store.dispatch(notificationsApi.util.resetApiState());
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;
    if (!token) return;

    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const user = json.data ?? json;
        // Re-set the auth status cookie: keeps its expiry fresh and restores it
        // for valid sessions that predate it, so the page guard in proxy.ts
        // doesn't bounce a logged-in user to /login.
        persistAuth(token);
        scheduleRefresh(token, () => get().refreshToken());
        set({ user, isAuthenticated: true });
      } else {
        get().logout();
      }
    } catch {
      console.error('Auth check failed');
    }
  },

  refreshToken: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;
    if (!token) return;
    try {
      const res = await fetch('/api/auth/refresh', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const newToken = (json.data ?? json).token as string;
        persistAuth(newToken);
        scheduleRefresh(newToken, () => get().refreshToken());
      } else {
        // Token rejected (revoked or corrupted) — force logout
        get().logout();
      }
    } catch {
      // Network blip — retry in 60 s rather than logging out
      _refreshTimer = setTimeout(() => get().refreshToken(), 60_000);
    }
  },

  clearError: () => set({ error: null }),
}));
