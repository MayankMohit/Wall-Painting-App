import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'painter' | 'owner' | 'admin';
  phone?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;

  registerUser: (userData: { name: string; email: string; password: string; role: 'painter' | 'owner'; phone?: string }) => Promise<boolean>;

  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ error: data.error || data.message || 'Failed to login', isLoading: false });
        return false;
      }

      const { token, user } = data.data || data; 

      localStorage.setItem('wallpainter_token', token);
      
      document.cookie = `wallpainter_auth_status=true; path=/; max-age=604800`;

      set({ user, isAuthenticated: true, isLoading: false });
      return true;

    } catch (err) {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },

  registerUser: async (userData) => {
    set({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ error: data.error || data.message || 'Failed to register', isLoading: false });
        return false;
      }

      // Success! Extract token and user
      const { token, user } = data.data || data; 

      // Save token and cookie exactly like login
      localStorage.setItem('wallpainter_token', token);
      document.cookie = `wallpainter_auth_status=true; path=/; max-age=604800`;

      set({ user, isAuthenticated: true, isLoading: false });
      return true;

    } catch (err) {
      set({ error: 'Network error. Please try again.', isLoading: false });
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('wallpainter_token');
    document.cookie = "wallpainter_auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.data || data;
        set({ user, isAuthenticated: true });
      } else {
        get().logout(); 
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  },

  clearError: () => set({ error: null })
}));