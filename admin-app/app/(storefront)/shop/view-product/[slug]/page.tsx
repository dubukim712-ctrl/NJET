import { getFeaturedStorefrontBikes, getStoreCatalog } from "@/data/commerce/catalog";
import { ProductDetailQuery } from "@/components/shop/ProductDetailQuery";

export const revalidate = 300;
export async function generateStaticParams() {
  const products = await getFeaturedStorefrontBikes();
  return (products ?? []).map(({ slug }) => ({ slug }));
}

export const metadata = {
  title: "Product Details",
};

export default async function ViewProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data } = await getStoreCatalog(slug, true);
  return (
    <div className="pb-24 lg:pb-12">
      <ProductDetailQuery slug={slug} initialData={data ?? undefined} />
    </div>
  );
}
