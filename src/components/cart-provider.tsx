"use client";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { z } from "zod";
import type { CartItem } from "@/lib/domain";
const key = "pc-exchange-cart-v1";
const schema = z
  .array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict())
  .max(30);
const listeners = new Set<() => void>();
let items: CartItem[] = [];
const empty: CartItem[] = [];
function emit() {
  listeners.forEach((l) => l());
}
function persist(next: CartItem[]) {
  items = next;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* Continue with a session cart when browser storage is unavailable. */
  }
  emit();
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function load() {
  try {
    const value = schema.safeParse(JSON.parse(localStorage.getItem(key) || "[]"));
    items = value.success ? value.data : [];
  } catch {
    items = [];
  }
  emit();
}
type CartContextType = {
  items: CartItem[];
  count: number;
  add: (id: string) => void;
  update: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const Context = createContext<CartContextType | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => items,
    () => empty,
  );
  useEffect(() => {
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const value: CartContextType = {
    items: snapshot,
    count: snapshot.reduce((sum, i) => sum + i.quantity, 0),
    add(id) {
      const found = items.find((i) => i.product_id === id);
      if (found) {
        persist(
          items.map((i) =>
            i.product_id === id ? { ...i, quantity: Math.min(i.quantity + 1, 10) } : i,
          ),
        );
      } else if (items.length < 30) {
        persist([...items, { product_id: id, quantity: 1 }]);
      }
    },
    update(id, quantity) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return;
      persist(items.map((i) => (i.product_id === id ? { ...i, quantity } : i)));
    },
    remove(id) {
      persist(items.filter((i) => i.product_id !== id));
    },
    clear() {
      persist([]);
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error("CartProvider is required");
  return value;
}
