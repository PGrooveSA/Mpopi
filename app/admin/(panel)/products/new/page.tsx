import { readDB } from "@/lib/store";
import ProductEditor from "@/components/admin/ProductEditor";
import { emptyProduct } from "@/lib/product-defaults";

export default async function NewProductPage() {
  const db = await readDB();
  return <ProductEditor initial={emptyProduct(db.collections[0]?.slug ?? "mpopi")} collections={db.collections} />;
}
