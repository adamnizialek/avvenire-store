import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '@/types';

function cartKey(id: string, size: string | null) {
  return size ? `${id}-${size}` : id;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => boolean;
  removeItem: (id: string, size: string | null) => void;
  updateQuantity: (id: string, size: string | null, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const state = get();
        const key = cartKey(item.id, item.size);
        const existing = state.items.find(
          (i) => cartKey(i.id, i.size) === key,
        );
        if (existing) {
          const max = item.maxQuantity ?? existing.maxQuantity;
          if (max !== undefined && existing.quantity >= max) {
            return false;
          }
          set({
            items: state.items.map((i) =>
              cartKey(i.id, i.size) === key
                ? { ...i, quantity: i.quantity + 1, maxQuantity: max }
                : i,
            ),
          });
          return true;
        }
        set({ items: [...state.items, { ...item, quantity: 1 }] });
        return true;
      },

      removeItem: (id, size) =>
        set((state) => {
          const key = cartKey(id, size);
          return {
            items: state.items.filter(
              (item) => cartKey(item.id, item.size) !== key,
            ),
          };
        }),

      updateQuantity: (id, size, quantity) =>
        set((state) => {
          const key = cartKey(id, size);
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => cartKey(item.id, item.size) !== key,
              ),
            };
          }
          return {
            items: state.items.map((item) => {
              if (cartKey(item.id, item.size) !== key) return item;
              const max = item.maxQuantity;
              const capped = max !== undefined ? Math.min(quantity, max) : quantity;
              return { ...item, quantity: capped };
            }),
          };
        }),

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + Number(item.price) * item.quantity,
          0,
        );
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
