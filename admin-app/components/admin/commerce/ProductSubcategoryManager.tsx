'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { saveProductSubcategoryAction } from '@/data/actions/commerce-admin';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { slugify } from '@/lib/commerce';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['product_categories']['Row'];
type Subcategory = Database['public']['Tables']['product_subcategories']['Row'];

function SubcategoryForm({
  categories,
  subcategory,
}: {
  categories: Category[];
  subcategory?: Subcategory;
}) {
  const router = useRouter();
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(subcategory?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const slugValue = !slugEdited && (!subcategory || name !== subcategory.name)
      ? slugify(name)
      : String(formData.get('slug') ?? '');
    try {
      const result = await saveProductSubcategoryAction({
        id: subcategory?.id ?? null,
        categoryId: formData.get('categoryId'),
        name,
        slug: slugValue,
        active: formData.get('active') === 'on',
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(subcategory ? 'Subcategory updated.' : 'Subcategory added.');
      await invalidateProducts();
      router.refresh();
    } catch (saveError) {
      console.error('Could not save product subcategory.', saveError);
      const message = 'Could not save this subcategory. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <Select
        name="categoryId"
        label="Main category"
        defaultValue={subcategory?.category_id ?? ''}
        required
        disabled={!categories.length}
      >
        <option value="" disabled>Select a main category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Input
        name="name"
        label="Subcategory name"
        defaultValue={subcategory?.name}
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
      {subcategory && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={subcategory.active}
            className="size-4 accent-primary"
          />
          Active
        </label>
      )}
      {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy} disabled={!categories.length}>
          {subcategory ? 'Save subcategory' : 'Add subcategory'}
        </Button>
      </div>
    </form>
  );
}

export function ProductSubcategoryManager({
  categories,
  subcategories,
  open,
  onOpenChange,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(true)}>
        Manage subcategories
      </Button>
      <Modal
        open={open}
        title="Manage subcategories"
        size="wide"
        onClose={() => onOpenChange(false)}
      >
        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Add a subcategory</h3>
            <SubcategoryForm categories={categories} />
          </section>
          <section className="space-y-4">
            <h3 className="font-semibold">Existing subcategories</h3>
            {!subcategories.length ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No subcategories configured yet.
              </p>
            ) : categories.map((category) => {
              const group = subcategories.filter((subcategory) =>
                subcategory.category_id === category.id
              );
              return (
                <div key={category.id} className="space-y-2">
                  <h4 className="text-sm font-semibold">{category.name}</h4>
                  {!group.length ? (
                    <p className="text-sm text-muted-foreground">No subcategories.</p>
                  ) : group.map((subcategory) => (
                    <details key={subcategory.id} className="rounded-lg border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        {subcategory.name} · {subcategory.active ? 'Active' : 'Inactive'}
                      </summary>
                      <div className="mt-3">
                        <SubcategoryForm
                          categories={categories}
                          subcategory={subcategory}
                        />
                      </div>
                    </details>
                  ))}
                </div>
              );
            })}
          </section>
        </div>
      </Modal>
    </>
  );
}
