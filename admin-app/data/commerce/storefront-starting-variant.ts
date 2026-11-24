import type { CatalogProduct } from '@/data/commerce/catalog';

export function getStartingVariant(product: CatalogProduct) {
  return product.variants.reduce<(typeof product.variants)[number] | null>(
    (lowest, variant) => !lowest || variant.price_minor < lowest.price_minor ? variant : lowest,
    null,
  );
}
