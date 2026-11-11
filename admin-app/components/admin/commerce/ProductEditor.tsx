'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Link2, Tag } from 'lucide-react';
import { saveCommerceProductAction } from '@/data/actions/commerce-admin';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/shop/ProductImage';
import { cleanupCommerceProductImage, uploadCommerceProductImage } from '@/data/commerce/product-images-client';
import { slugify } from '@/lib/commerce';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];
type Subcategory = Database['public']['Tables']['product_subcategories']['Row'];

export function ProductEditor({
  product,
  categories,
  subcategories,
  onCancel,
  onSaved,
}: {
  product?: Product;
  categories: Category[];
  subcategories: Subcategory[];
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(
    product?.category_id ?? categories.find((category) => category.tracks_serial_inventory)?.id ?? categories[0]?.id ?? ''
  );
  const [subcategoryId, setSubcategoryId] = useState(product?.subcategory_id ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const categoriesForProduct = subcategories.filter((subcategory) =>
    subcategory.category_id === categoryId
      && (subcategory.active || subcategory.id === product?.subcategory_id)
  );

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const generateSlug = !product || name !== product.name;
    const slugValue = !slugEdited && generateSlug
      ? slugify(name)
      : String(formData.get('slug') ?? '');
    let uploadedPath: string | null = null;
    try {
      const file = formData.get('image');
      if (file instanceof File && file.size > 0) {
        const upload = await uploadCommerceProductImage(file);
        if (upload.error || !upload.path) {
          const message = upload.error ?? 'Could not upload this image.';
          setError(message);
          toast.error(message);
          return;
        }
        uploadedPath = upload.path;
      }
      const result = await saveCommerceProductAction({
        id: product?.id ?? null,
        slug: slugValue,
        name,
        description: formData.get('description'),
        categoryId,
        subcategoryId: subcategoryId || null,
        imagePath: uploadedPath ?? (formData.get('clearImage') === 'on' ? null : product?.image_path ?? null),
        active: formData.get('active') === 'on',
      });
      if (!result.success) {
        const cleaned = uploadedPath
          ? await cleanupCommerceProductImage(uploadedPath)
          : true;
        const message = !cleaned
          ? `${result.error} The unused upload could not be removed.`
          : result.error;
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(product ? 'Product updated.' : 'Product created.');
      router.refresh();
      onSaved?.();
    } catch (saveError) {
      console.error('Could not save product.', saveError);
      if (uploadedPath) {
        const cleaned = await cleanupCommerceProductImage(uploadedPath);
        if (!cleaned) {
          const message = 'Could not save this product; the unused uploaded image could not be removed.';
          setError(message);
          toast.error(message);
          return;
        }
      }
      const message = 'Could not save this product. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4 rounded-lg border bg-background p-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" label="Product name" defaultValue={product?.name} onChange={(event) => {
          if (!slugEdited) setSlug(slugify(event.target.value));
        }} required leadingIcon={<Tag className="h-4 w-4" />} />
        <Input name="slug" label="URL slug" value={slug} onChange={(event) => {
          setSlug(event.target.value);
          setSlugEdited(true);
        }} required helperText="Generated from the product name; edit to customize." leadingIcon={<Link2 className="h-4 w-4" />} />
        <Select name="categoryId" label="Main category" value={categoryId} onChange={(event) => {
          setCategoryId(event.target.value);
          setSubcategoryId('');
        }} required disabled={!categories.length}>
          <option value="" disabled>Select a main category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </Select>
        <Select
          name="subcategoryId"
          label="Subcategory"
          value={subcategoryId}
          onChange={(event) => setSubcategoryId(event.target.value)}
          required={categoriesForProduct.length > 0}
        >
          <option value="">{categoriesForProduct.length ? 'Select a subcategory' : 'No subcategories configured'}</option>
          {categoriesForProduct.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}{!subcategory.active ? ' (inactive)' : ''}
            </option>
          ))}
        </Select>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-primary" />
          Available in storefront
        </label>
      </div>
      <label className="block space-y-1.5 text-sm font-medium">
        Description
        <textarea name="description" rows={3} defaultValue={product?.description ?? ''} maxLength={2000} className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
      </label>
      <div className="space-y-3">
        <Input
          name="image"
          label="General product image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          helperText="JPG, PNG, or WebP, up to 5 MB. Variants use this image unless they have an override."
          onChange={(event) => {
            if (previewRef.current) URL.revokeObjectURL(previewRef.current);
            previewRef.current = event.target.files?.[0]
              ? URL.createObjectURL(event.target.files[0])
              : null;
            setPreviewUrl(previewRef.current);
          }}
        />
        {(previewUrl || product?.image_path) && (
          <ProductImage
            path={product?.image_path ?? null}
            srcOverride={previewUrl}
            alt={`${product?.name ?? 'Product'} image preview`}
            className="max-w-sm rounded-lg"
          />
        )}
        {product?.image_path && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="clearImage" className="size-4 accent-primary" />
            Remove current product image
          </label>
        )}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {product ? 'Save product' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
