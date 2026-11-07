import { readDB } from "@/lib/store";
import ProductsTable from "@/components/admin/ProductsTable";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const db = await readDB();
  return <ProductsTable products={db.products} collections={db.collections} initialFilter={filter ?? "all"} hideSoldOut={db.settings.hideSoldOut} />;
}
