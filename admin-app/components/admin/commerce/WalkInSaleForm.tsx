'use client';

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createWalkInSaleAction } from '@/data/actions/walk-in-sales';
import {
  applyWalkInDiscountQuote,
  getWalkInCartPricing,
  type WalkInBranchOption,
  type WalkInCartLine,
  type WalkInCatalogItem,
} from '@/data/commerce/walk-in-sales';
import {
  walkInCatalogQueryOptions,
  WalkInCatalogQueryError,
} from '@/data/commerce/walk-in-sales-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { WalkInSaleSections } from '@/components/admin/commerce/WalkInSaleSections';
import { WalkInSaleActions } from '@/components/admin/commerce/WalkInSaleActions';
import { WalkInSaleCustomerDetails } from '@/components/admin/commerce/WalkInSaleCustomerDetails';
import { DiscountCodeInput } from '@/components/commerce/DiscountCodeInput';
import { useDiscountQuote } from '@/components/commerce/useDiscountQuote';
import type { WalkInSalePaymentValues } from '@/components/admin/commerce/WalkInSalePayment';
import type { PhilippineAddressValues } from '@/components/admin/commerce/PhilippineAddressFields';
import { formatPhp, parsePhpAmount } from '@/lib/commerce';

export function WalkInSaleForm({
  branches,
  initialBranchId,
  initialCatalog,
  canChooseBranch,
}: {
  branches: WalkInBranchOption[];
  initialBranchId: string;
  initialCatalog: WalkInCatalogItem[];
  canChooseBranch: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const [branchId, setBranchId] = useState(initialBranchId);
  const catalogQuery = useQuery({
    ...walkInCatalogQueryOptions(branchId),
    enabled: Boolean(branchId),
    initialData: branchId === initialBranchId ? initialCatalog : undefined,
  });
  const catalog = catalogQuery.data ?? initialCatalog;
  const catalogBusy =
    useIsFetching({ queryKey: ['commerce', 'walk-in-catalog'] }) > 0;
  const [cart, setCart] = useState<WalkInCartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [payment, setPayment] = useState<WalkInSalePaymentValues>({
    paymentMethod: 'cash',
    paymentProvider: 'gcash',
    paymentReference: '',
    cashTendered: '',
    addressLine1: '',
    barangay: '',
    city: '',
    province: '',
    postalCode: '',
    homeCreditDetails: {
      accountNo: '',
      downpayment: '',
      termsMonths: '',
      monthlyPayment: '',
    },
  });
  const [busy, setBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cartSignature = JSON.stringify({
    phone: contactNumber.trim(),
    items: cart.map(({ variantId, quantity }) => [variantId, quantity]),
  });
  const { activePreview, onApplied, onCleared } = useDiscountQuote(cartSignature);
  const displayCatalog = applyWalkInDiscountQuote(catalog, activePreview?.rows ?? []);
  const { cartQuantities, totalMinor, discountTotal, hasUnavailableItems } =
    getWalkInCartPricing(cart, displayCatalog);
  const cashTenderedMinor = parsePhpAmount(payment.cashTendered);
  const cashIsShort = payment.paymentMethod === 'cash' &&
    (cashTenderedMinor === null || cashTenderedMinor < totalMinor);

  const changeBranch = async (nextBranchId: string) => {
    if (!nextBranchId || nextBranchId === branchId) return;
    setCatalogError(null);
    setError(null);
    onCleared();
    try {
      await queryClient.fetchQuery(walkInCatalogQueryOptions(nextBranchId));
      setBranchId(nextBranchId);
    } catch (actionError) {
      if (actionError instanceof WalkInCatalogQueryError) {
        setCatalogError(actionError.message);
      } else {
        console.error('Could not load walk-in branch stock.', actionError);
        setCatalogError('Branch stock could not be loaded. Please try again.');
      }
    }
  };

  const addToCart = (product: WalkInCatalogItem) => {
    onCleared();
    setCart((current) => {
      const existing = current.find(
        (line) => line.variantId === product.variant_id
      );
      if (existing) {
        if (existing.quantity >= product.stock || existing.quantity >= 99) {
          return current;
        }
        return current.map((line) =>
          line.variantId === product.variant_id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return product.stock > 0
        ? [...current, { variantId: product.variant_id, quantity: 1 }]
        : current;
    });
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    onCleared();
    setCart((current) =>
      current.map((line) =>
        line.variantId === variantId ? { ...line, quantity } : line
      )
    );
  };

  const removeFromCart = (variantId: string) => {
    onCleared();
    setCart((current) => current.filter((line) => line.variantId !== variantId));
  };

  const submitSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!branchId) return setError('Select a selling branch before completing the sale.');
    if (!cart.length) return setError('Add at least one product to the sale.');
    if (catalogBusy) return setError('Wait for branch stock to finish loading.');
    if (hasUnavailableItems) {
      return setError('Adjust or remove items that are unavailable at this branch.');
    }
    if (cashIsShort) {
      return setError('Cash tendered must cover the sale total.');
    }
    if (payment.paymentMethod === 'home_credit') {
      const downpayment = parsePhpAmount(payment.homeCreditDetails.downpayment);
      const monthlyPayment = parsePhpAmount(payment.homeCreditDetails.monthlyPayment);
      const termsMonths = Number(payment.homeCreditDetails.termsMonths);
      if (!payment.homeCreditDetails.accountNo.trim() || downpayment === null ||
        downpayment > totalMinor || !Number.isInteger(termsMonths) ||
        termsMonths < 1 || termsMonths > 120 || monthlyPayment === null ||
        (downpayment < totalMinor && monthlyPayment === 0)) {
        return setError('Enter valid Home Credit account and financing details.');
      }
    }

    setBusy(true);
    try {
      const result = await createWalkInSaleAction({
        customerName,
        contactNumber,
        branchId,
        paymentMethod: payment.paymentMethod,
        paymentProvider:
          payment.paymentMethod === 'online' ? payment.paymentProvider : null,
        paymentReference:
          payment.paymentMethod === 'online' ? payment.paymentReference : null,
        cashTenderedMinor:
          payment.paymentMethod === 'cash' ? cashTenderedMinor : null,
        addressLine1: payment.addressLine1.trim() || null,
        barangay: payment.barangay.trim() || null,
        city: payment.city.trim() || null,
        province: payment.province.trim() || null,
        postalCode: payment.postalCode.trim() || null,
        homeCreditDetails:
          payment.paymentMethod === 'home_credit'
            ? payment.homeCreditDetails
            : null,
        items: cart,
        couponCode: activePreview?.code ?? null,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      void invalidateProducts();
      void queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey });
      toast.success('Walk-in sale completed.');
      router.push('/admin/orders');
    } catch (actionError) {
      console.error('Could not create walk-in sale.', actionError);
      setError('The sale could not be confirmed. Check Orders before retrying.');
      toast.error('The sale could not be confirmed. Check Orders before retrying.');
    } finally {
      setBusy(false);
    }
  };

  const changeMinor = payment.paymentMethod === 'cash' && cashTenderedMinor !== null
    ? cashTenderedMinor - totalMinor
    : null;

  return (
    <form className="space-y-5" onSubmit={submitSale}>
      <WalkInSaleCustomerDetails
        branches={branches}
        branchId={branchId}
        canChooseBranch={canChooseBranch}
        customerName={customerName}
        contactNumber={contactNumber}
        address={{
          addressLine1: payment.addressLine1,
          province: payment.province,
          city: payment.city,
          barangay: payment.barangay,
          postalCode: payment.postalCode,
        }}
        disabled={catalogBusy || busy}
        onBranchChange={(id) => void changeBranch(id)}
        onCustomerNameChange={setCustomerName}
        onContactNumberChange={(value) => {
          setContactNumber(value);
          onCleared();
        }}
        onAddressChange={(address: PhilippineAddressValues) =>
          setPayment((current) => ({ ...current, ...address }))
        }
      />

      {catalogError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {catalogError}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {branchId ? (
        <WalkInSaleSections
          products={displayCatalog}
          cart={cart}
          cartQuantities={cartQuantities}
          totalMinor={totalMinor}
          discountTotal={discountTotal}
          couponInput={
            <DiscountCodeInput
              key={cartSignature}
              channel="walk_in"
              appliedCode={activePreview?.code}
              phone={contactNumber}
              items={cart.map(({ variantId, quantity }) => ({ variantId, quantity }))}
              disabled={busy || catalogBusy || !cart.length}
              onApplied={onApplied}
              onCleared={onCleared}
            />
          }
          catalogBusy={catalogBusy}
          busy={busy}
          onAdd={addToCart}
          onQuantityChange={updateQuantity}
          onRemove={removeFromCart}
          payment={payment}
          onPaymentChange={setPayment}
          cashTenderedMinor={cashTenderedMinor}
          cashIsShort={cashIsShort}
          changeMinor={changeMinor}
        />
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground" role="status">
          {catalogBusy
            ? 'Loading stock for the selected branch…'
            : 'Select a selling branch to load its stock and begin the sale.'}
        </p>
      )}

      <WalkInSaleActions
        busy={busy}
        canComplete={
          Boolean(cart.length && branchId) &&
          !catalogBusy &&
          !hasUnavailableItems &&
          !cashIsShort
        }
      />
    </form>
  );
}
