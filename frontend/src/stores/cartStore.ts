import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '@/types';

function cartKey(id: string, size: string | null) {
  return size ? `${id}-${size}` : id;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
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

      addItem: (item) =>
        set((state) => {
          const key = cartKey(item.id, item.size);
          const existing = state.items.find(
            (i) => cartKey(i.id, i.size) === key,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartKey(i.id, i.size) === key
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

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
          return {
            items:
              quantity <= 0
                ? state.items.filter(
                    (item) => cartKey(item.id, item.size) !== key,
                  )
                : state.items.map((item) =>
                    cartKey(item.id, item.size) === key
                      ? { ...item, quantity }
                      : item,
                  ),
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
