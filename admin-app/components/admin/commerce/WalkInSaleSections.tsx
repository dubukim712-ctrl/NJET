'use client';

import { WalkInProductCatalog } from '@/components/admin/commerce/WalkInProductCatalog';
import { WalkInSaleCart } from '@/components/admin/commerce/WalkInSaleCart';
import {
  WalkInSalePayment,
  type WalkInSalePaymentValues,
} from '@/components/admin/commerce/WalkInSalePayment';
import type {
  WalkInCartLine,
  WalkInCatalogItem,
} from '@/data/commerce/walk-in-sales';

export function WalkInSaleSections({
  products,
  cart,
  cartQuantities,
  totalMinor,
  catalogBusy,
  busy,
  onAdd,
  onQuantityChange,
  onRemove,
  payment,
  onPaymentChange,
  cashTenderedMinor,
  cashIsShort,
  changeMinor,
}: {
  products: WalkInCatalogItem[];
  cart: WalkInCartLine[];
  cartQuantities: Map<string, number>;
  totalMinor: number;
  catalogBusy: boolean;
  busy: boolean;
  onAdd: (product: WalkInCatalogItem) => void;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  payment: WalkInSalePaymentValues;
  onPaymentChange: (values: WalkInSalePaymentValues) => void;
  cashTenderedMinor: number | null;
  cashIsShort: boolean;
  changeMinor: number | null;
}) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.8fr)]">
      <WalkInProductCatalog
        products={products}
        cartQuantities={cartQuantities}
        disabled={catalogBusy || busy}
        onAdd={onAdd}
      />
      <div className="space-y-5">
        <WalkInSaleCart
          products={products}
          cart={cart}
          totalMinor={totalMinor}
          disabled={busy || catalogBusy}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
        />
        <WalkInSalePayment
          values={payment}
          onChange={onPaymentChange}
          totalMinor={totalMinor}
          cashTenderedMinor={cashTenderedMinor}
          cashIsShort={cashIsShort}
          changeMinor={changeMinor}
          disabled={busy}
        />
      </div>
    </div>
  );
}
