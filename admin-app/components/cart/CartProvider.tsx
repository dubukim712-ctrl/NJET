'use client';

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  addCartItem,
  clearCart,
  getCartSnapshot,
  getServerCartSnapshot,
  parseCartSnapshot,
  removeCartItem,
  setCartItemQuantity,
  subscribeToCart,
  writeCart,
  type CartItem,
} from '@/data/cart';

type CartResult = { success: true } | { success: false; error: string };

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  error: string | null;
  addItem: (variantId: string) => CartResult;
  setQuantity: (variantId: string, quantity: number) => CartResult;
  removeItem: (variantId: string) => CartResult;
  clear: () => CartResult;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot
  );
  const { items, error } = useMemo(
    () => parseCartSnapshot(snapshot),
    [snapshot]
  );

  const commit = (nextItems: CartItem[]): CartResult => {
    try {
      writeCart(nextItems);
      return { success: true };
    } catch {
      const message = 'Could not save your cart in this browser.';
      return { success: false, error: message };
    }
  };

  const addItem = (variantId: string): CartResult => {
    const result = addCartItem(items, variantId);
    return result.success ? commit(result.items) : result;
  };

  const setQuantity = (variantId: string, quantity: number): CartResult => {
    const result = setCartItemQuantity(items, variantId, quantity);
    return result.success ? commit(result.items) : result;
  };

  const removeItem = (variantId: string): CartResult => {
    const result = removeCartItem(items, variantId);
    return result.success ? commit(result.items) : result;
  };
  const clear = (): CartResult => {
    try {
      clearCart();
      return { success: true };
    } catch {
      return { success: false, error: 'Could not clear your cart in this browser.' };
    }
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, itemCount, error, addItem, setQuantity, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider.');
  }
  return context;
}
