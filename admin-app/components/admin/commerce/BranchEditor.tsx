'use client';

import { useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Link2, MapPin, Store } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { saveCommerceBranchAction } from '@/data/actions/commerce-admin';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { useInvalidateAdminBranchesQuery } from '@/data/commerce/admin-branches-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { useInvalidateCheckoutOptionsQuery } from '@/data/commerce/checkout-options-client';
import { useInvalidateAdminUsersQuery } from '@/data/rbac/admin-users-client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { slugify } from '@/lib/commerce';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

const BranchLocationPicker = dynamic(
  () => import('@/components/admin/commerce/BranchLocationPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-lg border bg-muted sm:h-96" />
    ),
  }
);

export function BranchEditor({
  branch,
  onCancel,
  onSaved,
}: {
  branch?: Branch;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateBranches = useInvalidateAdminBranchesQuery();
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateCheckoutOptions = useInvalidateCheckoutOptionsQuery();
  const invalidateUsers = useInvalidateAdminUsersQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(branch?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [address, setAddress] = useState(branch?.address ?? '');
  const [addressResolving, setAddressResolving] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(branch?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(branch?.longitude ?? null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const generateSlug = !branch || name !== branch.name;
    const slugValue = !slugEdited && generateSlug
      ? slugify(name)
      : String(formData.get('slug') ?? '');
    try {
      const result = await saveCommerceBranchAction({
        id: branch?.id ?? null,
        slug: slugValue,
        name,
        address,
        latitude,
        longitude,
        active: formData.get('active') === 'on',
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(branch ? 'Branch updated.' : 'Branch added.');
      await Promise.all([
        invalidateBranches(),
        invalidateProducts(),
        invalidateCheckoutOptions(),
        invalidateUsers(),
        queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey }),
      ]);
      router.refresh();
      onSaved();
    } catch (saveError) {
      console.error('Could not save branch.', saveError);
      const message = 'Could not save the branch. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Branch name"
          defaultValue={branch?.name}
          onChange={(event) => {
            if (!slugEdited) setSlug(slugify(event.target.value));
          }}
          required
          leadingIcon={<Store className="h-4 w-4" />}
        />
        <Input
          name="slug"
          label="URL slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugEdited(true);
          }}
          required
          helperText="Generated from the branch name; edit to customize."
          leadingIcon={<Link2 className="h-4 w-4" />}
        />
      </div>
      <BranchLocationPicker
        latitude={latitude}
        longitude={longitude}
        onChange={(nextLatitude, nextLongitude) => {
          setLatitude(nextLatitude);
          setLongitude(nextLongitude);
        }}
        onAddressChange={setAddress}
        onAddressResolvingChange={setAddressResolving}
      />
      <Input
        name="address"
        label="Address"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        disabled={addressResolving}
        required
        maxLength={500}
        helperText={
          addressResolving
            ? 'Finding the address for the pin...'
            : 'Filled from the pin when available. You can edit it.'
        }
        leadingIcon={<MapPin className="h-4 w-4" />}
      />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={branch?.active ?? true}
          className="size-4 accent-primary"
        />
        Available for pickup and delivery
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={addressResolving}>
          {branch ? 'Save branch' : 'Add branch'}
        </Button>
      </div>
    </form>
  );
}
