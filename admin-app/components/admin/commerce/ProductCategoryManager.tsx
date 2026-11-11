'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { saveProductCategoryAction } from '@/data/actions/commerce-admin';
import { slugify } from '@/lib/commerce';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['product_categories']['Row'];

function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const slugValue = !slugEdited && (!category || name !== category.name)
      ? slugify(name)
      : String(formData.get('slug') ?? '');
    try {
      const result = await saveProductCategoryAction({
        id: category?.id ?? null,
        tracksSerialInventory: category?.tracks_serial_inventory
          ?? formData.get('tracksSerialInventory') === 'on',
        name,
        slug: slugValue,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(category ? 'Main category updated.' : 'Main category added.');
      router.refresh();
    } catch (saveError) {
      console.error('Could not save product category.', saveError);
      const message = 'Could not save this main category. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <Input
        name="name"
        label="Category name"
        defaultValue={category?.name}
        onChange={(event) => {
          if (!slugEdited) setSlug(slugify(event.target.value));
        }}
        required
        maxLength={80}
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
        helperText="Generated from the name; edit to customize."
      />
      {category ? (
        <p className="flex min-h-11 items-center text-sm text-muted-foreground">
          {category.tracks_serial_inventory
            ? 'Serial-tracked e-bike inventory'
            : 'Standard inventory'}
        </p>
      ) : (
        <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="tracksSerialInventory"
            className="size-4 accent-primary"
          />
          Track e-bike serial numbers and motor numbers
        </label>
      )}
      {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy}>
          {category ? 'Save category' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}

export function ProductCategoryManager({
  categories,
  open,
  onOpenChange,
}: {
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(true)}>
        Manage main categories
      </Button>
      <Modal
        open={open}
        title="Manage main categories"
        size="wide"
        onClose={() => onOpenChange(false)}
      >
        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Add a main category</h3>
            <CategoryForm />
          </section>
          <section className="space-y-3">
            <h3 className="font-semibold">Existing categories</h3>
            {!categories.length ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No main categories configured.
              </p>
            ) : categories.map((category) => (
              <details key={category.id} className="rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {category.name}
                </summary>
                <div className="mt-4">
                  <CategoryForm category={category} />
                </div>
              </details>
            ))}
          </section>
        </div>
      </Modal>
    </>
  );
}
