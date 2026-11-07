import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import ProductEditor from "@/components/admin/ProductEditor";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const product = db.products.find((p) => p.id === id);
  if (!product) notFound();
  return <ProductEditor key={product.updatedAt} initial={product} collections={db.collections} />;
}
