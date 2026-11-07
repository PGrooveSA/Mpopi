"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Size } from "./types";

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  colorId: string;
  colorName: string;
  hex: string;
  print: string;
  size: Size;
  qty: number;
  price: number;
  maxQty: number;
}

interface CartState {
  items: CartItem[];
  open: boolean;
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item, qty = 1) =>
        set((s) => {
          const key = `${item.productId}|${item.colorId}|${item.size}`;
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              open: true,
              items: s.items.map((i) => (i.key === key ? { ...i, ...item, qty: Math.min(item.maxQty, i.qty + qty) } : i)),
            };
          }
          return { open: true, items: [...s.items, { ...item, key, qty: Math.min(item.maxQty, qty) }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.maxQty, qty)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "mpopi-cart",
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((n, i) => n + i.qty * i.price, 0);
