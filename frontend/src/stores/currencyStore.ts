import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CurrencyCode } from '@/lib/currency';
import { DEFAULT_CURRENCY } from '@/lib/currency';

interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'currency-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
