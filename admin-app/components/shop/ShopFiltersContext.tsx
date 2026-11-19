'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

type ShopFiltersContextValue = {
  open: boolean;
  popoverRoot: HTMLElement | null;
};

const ShopFiltersContext = createContext<ShopFiltersContextValue | null>(null);

export function ShopFiltersProvider({
  value,
  children,
}: {
  value: ShopFiltersContextValue;
  children: ReactNode;
}) {
  return (
    <ShopFiltersContext.Provider value={value}>
      {children}
    </ShopFiltersContext.Provider>
  );
}

export function useShopFilters() {
  const context = useContext(ShopFiltersContext);
  if (!context) {
    throw new Error('Shop filters must be used within ShopFiltersProvider.');
  }
  return context;
}
