import { create } from 'zustand';
import api from '@/lib/axios';
import { useCartStore } from '@/stores/cartStore';
import type { User, AuthResponse } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => void;
}

// The JWT lives in an httpOnly cookie managed entirely by the backend — the
// store never sees it. Only the (non-secret) profile is cached for fast
// hydration on reload.

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    const { user } = response.data;
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user });
  },

  register: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
    });
    const { user } = response.data;
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    // Ask the backend to clear the httpOnly cookie; local state is cleared
    // regardless so the UI logs out even if the request fails offline.
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('auth_user');
    // Don't leave the previous user's cart for the next person on a shared device.
    useCartStore.getState().clearCart();
    set({ user: null });
  },

  initializeAuth: () => {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        // Hydrate immediately for fast first paint...
        set({ user, isLoading: false });
        // ...then confirm the cookie session is still valid and refresh the
        // role from the server (a 401 is handled by the axios interceptor,
        // which logs out).
        api
          .get<User>('/auth/profile')
          .then((res) => {
            localStorage.setItem('auth_user', JSON.stringify(res.data));
            set({ user: res.data });
          })
          .catch(() => {});
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
