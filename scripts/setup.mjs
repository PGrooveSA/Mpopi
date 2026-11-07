// One-time local setup: creates .env.local with a random secret and admin password.
// Run with:  npm run setup
import { existsSync, writeFileSync, readFileSync } from "fs";
import { randomBytes } from "crypto";

const ENV = ".env.local";

if (existsSync(ENV)) {
  const pw = readFileSync(ENV, "utf8").match(/^ADMIN_PASSWORD=(.*)$/m)?.[1];
  console.log(`\n✔ ${ENV} already exists — nothing changed.`);
  if (pw) console.log(`  Admin login: see ADMIN_EMAIL / ADMIN_PASSWORD in ${ENV}`);
} else {
  const secret = randomBytes(32).toString("base64url");
  const password = randomBytes(9).toString("base64url");
  writeFileSync(
    ENV,
    `# Local development settings (never commit this file)
AUTH_SECRET=${secret}
# First admin account - created automatically the first time the site starts.
ADMIN_EMAIL=admin@mpopi.co.za
ADMIN_PASSWORD=${password}
# Where the database file and uploaded images are stored
DATA_DIR=./data
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`,
  );
  console.log(`\n✔ Created ${ENV}`);
  console.log(`  Admin login → email: admin@mpopi.co.za   password: (see ADMIN_PASSWORD in ${ENV})`);
}
console.log("\nNext: npm run dev  →  http://localhost:3000  (admin: http://localhost:3000/admin)\n");
