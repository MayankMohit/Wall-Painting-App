import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'painter' | 'owner' | 'admin';
  phone: string;
  emailVerified: boolean;
  status: 'active' | 'inactive' | 'suspended';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (identifier: string, password: string) => Promise<boolean>;
  loginWithEmailOtp: (sessionId: string, otp: string) => Promise<boolean>;
  loginWithPhoneOtp: (phone: string, firebaseIdToken: string) => Promise<boolean>;

  registerUser: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'painter' | 'owner';
    firebaseIdToken: string;
    emailOtp?: string;
    emailSessionId?: string;
  }) => Promise<boolean>;

  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

function persistAuth(token: string) {
  localStorage.setItem('wallpainter_token', token);
  document.cookie = `wallpainter_auth_status=true; path=/; max-age=604800`;
}

async function callApi(url: string, body: unknown): Promise<{ ok: boolean; token?: string; user?: User; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const payload = json.data ?? json;
  return res.ok
    ? { ok: true, token: payload.token, user: payload.user }
    : { ok: false, error: payload.error ?? payload.message ?? 'Something went wrong' };
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
      set({ user: result.user!, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  loginWithPhoneOtp: async (phone, firebaseIdToken) => {
    set({ isLoading: true, error: null });
    try {
      const result = await callApi('/api/auth/login/otp/phone', { phone, firebaseIdToken });
      if (!result.ok) {
        set({ error: result.error, isLoading: false });
        return false;
      }
      persistAuth(result.token!);
      set({ user: result.user!, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
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
      set({ user: result.user!, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  logout: () => {
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
        set({ user, isAuthenticated: true });
      } else {
        get().logout();
      }
    } catch {
      console.error('Auth check failed');
    }
  },

  clearError: () => set({ error: null }),
}));
