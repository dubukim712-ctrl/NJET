'use client';

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createWalkInSaleAction } from '@/data/actions/walk-in-sales';
import type {
  WalkInBranchOption,
  WalkInCartLine,
  WalkInCatalogItem,
} from '@/data/commerce/walk-in-sales';
import {
  walkInCatalogQueryOptions,
  WalkInCatalogQueryError,
} from '@/data/commerce/walk-in-sales-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { Button } from '@/components/ui/Button';
import { WalkInSaleSections } from '@/components/admin/commerce/WalkInSaleSections';
import { WalkInSaleCustomerDetails } from '@/components/admin/commerce/WalkInSaleCustomerDetails';
import type { WalkInSalePaymentValues } from '@/components/admin/commerce/WalkInSalePayment';
import type { PhilippineAddressValues } from '@/components/admin/commerce/PhilippineAddressFields';
import { formatPhp, parsePhpAmount } from '@/lib/commerce';

export function WalkInSaleForm({
  branches,
  initialBranchId,
  initialCatalog,
}: {
  branches: WalkInBranchOption[];
  initialBranchId: string;
  initialCatalog: WalkInCatalogItem[];
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

  const cartQuantities = new Map(
    cart.map((line) => [line.variantId, line.quantity])
  );
  const productByVariant = new Map(
    catalog.map((product) => [product.variant_id, product])
  );
  const totalMinor = cart.reduce((total, line) => {
    const product = productByVariant.get(line.variantId);
    return total + (product ? product.price_minor * line.quantity : 0);
  }, 0);
  const hasUnavailableItems = cart.some((line) => {
    const product = productByVariant.get(line.variantId);
    return !product || line.quantity > product.stock;
  });
  const cashTenderedMinor = parsePhpAmount(payment.cashTendered);
  const cashIsShort =
    payment.paymentMethod === 'cash' &&
    (cashTenderedMinor === null || cashTenderedMinor < totalMinor);

  const changeBranch = async (nextBranchId: string) => {
    if (!nextBranchId || nextBranchId === branchId) return;
    setCatalogError(null);
    setError(null);
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
    setCart((current) =>
      current.map((line) =>
        line.variantId === variantId ? { ...line, quantity } : line
      )
    );
  };

  const submitSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
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

  const changeMinor =
    payment.paymentMethod === 'cash' && cashTenderedMinor !== null
      ? cashTenderedMinor - totalMinor
      : null;

  return (
    <form className="space-y-5" onSubmit={submitSale}>
      <WalkInSaleCustomerDetails
        branches={branches}
        branchId={branchId}
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
        onContactNumberChange={setContactNumber}
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
      {catalogBusy && (
        <p className="text-sm text-muted-foreground" role="status">
          Loading stock for the selected branch…
        </p>
      )}

      <WalkInSaleSections
        products={catalog}
        cart={cart}
        cartQuantities={cartQuantities}
        totalMinor={totalMinor}
        catalogBusy={catalogBusy}
        busy={busy}
        onAdd={addToCart}
        onQuantityChange={updateQuantity}
        onRemove={(variantId) =>
          setCart((current) => current.filter((line) => line.variantId !== variantId))
        }
        payment={payment}
        onPaymentChange={setPayment}
        cashTenderedMinor={cashTenderedMinor}
        cashIsShort={cashIsShort}
        changeMinor={changeMinor}
      />

      <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild disabled={busy}>
          <Link href="/admin/orders">Cancel</Link>
        </Button>
        <Button
          type="submit"
          loading={busy}
          disabled={
            !cart.length ||
            catalogBusy ||
            hasUnavailableItems ||
            cashIsShort
          }
        >
          Complete sale
        </Button>
      </footer>
    </form>
  );
}
