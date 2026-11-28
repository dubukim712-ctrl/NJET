import { revalidatePath } from 'next/cache';

export function revalidateStorefrontCatalog() {
  revalidatePath('/');
  revalidatePath('/catalog');
  revalidatePath('/shop');
  revalidatePath('/shop/view-product/[slug]', 'page');
}
