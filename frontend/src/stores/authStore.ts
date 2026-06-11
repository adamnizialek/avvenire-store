import { create } from 'zustand';
import api from '@/lib/axios';
import { useCartStore } from '@/stores/cartStore';
import type { User, AuthResponse } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    const { access_token, user } = response.data;
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ token: access_token, user });
  },

  register: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
    });
    const { access_token, user } = response.data;
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ token: access_token, user });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    // Don't leave the previous user's cart for the next person on a shared device.
    useCartStore.getState().clearCart();
    set({ token: null, user: null });
  },

  initializeAuth: () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Hydrate immediately for fast first paint...
        set({ token, user, isLoading: false });
        // ...then confirm the token is still valid and refresh the role from the
        // server (a 401 is handled by the axios interceptor, which logs out).
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
