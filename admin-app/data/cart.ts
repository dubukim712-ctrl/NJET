export interface CartItem {
  variantId: string;
  quantity: number;
}

export type BranchStockAvailability = {
  available: boolean;
  stock: number | null;
};

export type CartMutation =
  | { success: true; items: CartItem[] }
  | { success: false; error: string };

const STORAGE_KEY = 'njet-commerce-cart-v1';
const EMPTY_CART = '[]';
const STORAGE_ERROR = '__cart_storage_error__';
const MAX_QUANTITY = 99;
const MAX_CART_ITEMS = 30;
const VARIANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cartListeners = new Set<() => void>();

export function getAvailableQuantityLimit(
  stockByBranch: readonly BranchStockAvailability[]
) {
  const availableBranches = stockByBranch.filter((branch) => branch.available);
  if (availableBranches.some((branch) => branch.stock === null)) return null;

  return availableBranches.reduce(
    (max, branch) => Math.max(max, branch.stock ?? 0),
    0
  );
}

function stockLimitError(maxQuantity: number) {
  return maxQuantity === 0
    ? 'This item is currently out of stock.'
    : `Only ${maxQuantity} can be ordered from a single branch.`;
}

export function subscribeToCart(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  cartListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    cartListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function getCartSnapshot() {
  if (typeof window === 'undefined') return EMPTY_CART;
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_CART;
  } catch {
    return STORAGE_ERROR;
  }
}

export function getServerCartSnapshot() {
  return EMPTY_CART;
}

export function parseCartSnapshot(snapshot: string) {
  if (snapshot === STORAGE_ERROR) {
    return { items: [] as CartItem[], error: 'Could not load the saved cart from this browser.' };
  }
  if (snapshot === EMPTY_CART) return { items: [] as CartItem[], error: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    return { items: [] as CartItem[], error: 'Saved cart data is invalid.' };
  }

  if (!Array.isArray(parsed)) {
    return { items: [] as CartItem[], error: 'Saved cart data is invalid.' };
  }

  const items: CartItem[] = [];
  const variantIds = new Set<string>();
  for (const value of parsed) {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('variantId' in value) ||
      !('quantity' in value) ||
      typeof value.variantId !== 'string' ||
      !VARIANT_ID.test(value.variantId) ||
      typeof value.quantity !== 'number' ||
      !Number.isInteger(value.quantity) ||
      value.quantity < 1 ||
      value.quantity > MAX_QUANTITY ||
      variantIds.has(value.variantId)
    ) {
      return { items: [] as CartItem[], error: 'Saved cart data is invalid.' };
    }

    variantIds.add(value.variantId);
    items.push({ variantId: value.variantId, quantity: value.quantity });
  }

  if (items.length > MAX_CART_ITEMS) {
    return { items: [] as CartItem[], error: 'Your saved cart has too many items.' };
  }
  return { items, error: null };
}

export function addCartItem(
  items: CartItem[],
  variantId: string,
  maxQuantity?: number | null
): CartMutation {
  if (!VARIANT_ID.test(variantId)) {
    return { success: false, error: 'This product variant is invalid.' };
  }

  const existing = items.find((item) => item.variantId === variantId);
  if (
    maxQuantity !== undefined &&
    maxQuantity !== null &&
    (existing?.quantity ?? 0) >= maxQuantity
  ) {
    return { success: false, error: stockLimitError(maxQuantity) };
  }
  if (existing?.quantity === MAX_QUANTITY) {
    return {
      success: false,
      error: `You can add up to ${MAX_QUANTITY} of each item.`,
    };
  }
  if (!existing && items.length >= MAX_CART_ITEMS) {
    return { success: false, error: `You can add up to ${MAX_CART_ITEMS} different items.` };
  }

  return {
    success: true,
    items: existing
      ? items.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...items, { variantId, quantity: 1 }],
  };
}

export function setCartItemQuantity(
  items: CartItem[],
  variantId: string,
  quantity: number,
  maxQuantity?: number | null
): CartMutation {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return {
      success: false,
      error: `Quantity must be between 1 and ${MAX_QUANTITY}.`,
    };
  }
  const existing = items.find((item) => item.variantId === variantId);
  if (!existing) {
    return { success: false, error: 'This item is not in your cart.' };
  }
  if (
    maxQuantity !== undefined &&
    maxQuantity !== null &&
    quantity > existing.quantity &&
    quantity > maxQuantity
  ) {
    return { success: false, error: stockLimitError(maxQuantity) };
  }

  return {
    success: true,
    items: items.map((item) =>
      item.variantId === variantId ? { ...item, quantity } : item
    ),
  };
}

export function removeCartItem(
  items: CartItem[],
  variantId: string
): CartMutation {
  return {
    success: true,
    items: items.filter((item) => item.variantId !== variantId),
  };
}

export function writeCart(items: CartItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  for (const listener of cartListeners) listener();
}

export function clearCart() {
  writeCart([]);
}
