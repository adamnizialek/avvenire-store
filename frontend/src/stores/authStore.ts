import { create } from 'zustand';
import api from '@/lib/axios';
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
    set({ token: null, user: null });
  },

  initializeAuth: () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
