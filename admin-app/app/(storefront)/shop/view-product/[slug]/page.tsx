import { ProductDetailQuery } from "@/components/shop/ProductDetailQuery";

export const metadata = {
  title: "Product Details",
};

export default async function ViewProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetailQuery slug={slug} />;
}
