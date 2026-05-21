import { create } from 'zustand';

interface User {
  name: string;
  email: string;
  role: 'painter' | 'owner' | 'admin';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  // Real function (we will connect this to the API later)
  login: (email: string, role: 'painter' | 'owner') => void;
  logout: () => void;
  
  // Dev Hacks for fast testing
  devLoginAsPainter: () => void;
  devLoginAsOwner: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: (email, role) => set({ 
    user: { name: 'Live User', email, role }, 
    isAuthenticated: true 
  }),
  
  logout: () => set({ user: null, isAuthenticated: false }),

  devLoginAsPainter: () => set({ 
    user: { name: 'Test Painter', email: 'painter@test.com', role: 'painter' }, 
    isAuthenticated: true 
  }),
  
  devLoginAsOwner: () => set({ 
    user: { name: 'Test Owner', email: 'owner@test.com', role: 'owner' }, 
    isAuthenticated: true 
  }),
}));