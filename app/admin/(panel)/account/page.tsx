import { getAdmin } from "@/lib/auth";
import { readDB } from "@/lib/store";
import AccountForm from "@/components/admin/AccountForm";

export default async function AccountPage() {
  const me = (await getAdmin())!;
  const db = await readDB();
  return <AccountForm me={me} admins={db.admins.map((a) => ({ id: a.id, email: a.email, name: a.name }))} />;
}
