import { readDB } from "@/lib/store";
import SettingsForm from "@/components/admin/SettingsForm";

export default async function SettingsPage() {
  const db = await readDB();
  return <SettingsForm initialSettings={db.settings} initialCollections={db.collections} />;
}
