// Emergency admin password reset — only works for someone who holds the database credentials.
//
//   Local site:       node --env-file=.env.local scripts/reset-admin.mjs admin@mpopi.co.za
//   Live (Supabase):  node --env-file=.env.vercel.local scripts/reset-admin.mjs admin@mpopi.co.za
//
// Prints a new random password once, and signs that admin out of every device.
// There are no emailed reset links, so nothing can leak or needs to expire.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";
import bcrypt from "bcryptjs";

const email = (process.argv[2] || "").toLowerCase().trim();
if (!email) {
  console.error("Usage: node --env-file=<env file> scripts/reset-admin.mjs <admin email>");
  process.exit(1);
}
const password = randomBytes(12).toString("base64url");
const hash = await bcrypt.hash(password, 12);

function apply(db) {
  const admin = db.admins.find((a) => a.email === email);
  if (!admin) {
    console.error(`No admin with email ${email}. Admins: ${db.admins.map((a) => a.email).join(", ")}`);
    process.exit(1);
  }
  admin.passwordHash = hash;
  admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (url) {
  const { default: pg } = await import("pg");
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
  const client = new pg.Client({ connectionString: u.toString(), ssl: local ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT data FROM mpopi_store WHERE id = 1 FOR UPDATE");
    if (!rows.length) throw new Error("The shop database is empty — open the website once first.");
    const db = rows[0].data;
    apply(db);
    await client.query("UPDATE mpopi_store SET data = $1, updated_at = now() WHERE id = 1", [JSON.stringify(db)]);
    await client.query("INSERT INTO mpopi_security_log (type, ip, path, detail) VALUES ('password_changed', 'cli', 'scripts/reset-admin', $1)", [
      `emergency reset for ${email}; all sessions signed out`,
    ]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
} else {
  const file = path.join(path.resolve(process.env.DATA_DIR || "data"), "db.json");
  if (!existsSync(file)) throw new Error(`No local database at ${file} — start the site once first.`);
  const db = JSON.parse(readFileSync(file, "utf8"));
  apply(db);
  writeFileSync(file, JSON.stringify(db, null, 2));
}

console.log(`\n✔ Password reset for ${email} (${url ? "live database" : "local database"})`);
console.log(`  New password: ${password}`);
console.log("  All existing sessions are signed out. Change this password after signing in (Admin → Account).\n");
