# MPOPI… online store

Modern glass-style t-shirt store for **MPOPI…** and **Hiswona…** with a 3D fitting room,
WhatsApp checkout and an admin panel.

## Run locally (VS Code)

1. Install **Node.js 20+** (https://nodejs.org) and open this folder in VS Code (*File → Open Folder…*).
2. First time only — open a terminal (*Terminal → New Terminal*) and run:
   ```bash
   npm install
   npm run setup
   ```
   `setup` creates `.env.local` with a random secret and the admin login (email + password are in that file).
3. Start the site: press **F5** (or *Run and Debug → “MPOPI: run site”*). VS Code starts the dev server and opens
   http://localhost:3000 in Chrome with breakpoints working in both server and browser code.
   Prefer the terminal? `npm run dev`.
4. Admin panel: http://localhost:3000/admin (or pick *“MPOPI: open admin panel”* in Run and Debug).

Handy commands (also under *Terminal → Run Task…*):

| Command | What it does |
|---|---|
| `npm run dev` | Start the site with live reload |
| `npm run typecheck` | Check the code for type errors |
| `npm run build && npm start` | Run the optimised production version locally |
| `npm run reset-data` | Delete local orders/edits and start fresh with the demo products |

Change the admin password after the first login under **Admin → Account**. Shop data lives in `data/`
(created automatically on first start).

## How it works

| Area | Where |
|---|---|
| Storefront pages | `app/(shop)/…` |
| 3D fitting room | `components/fitting/` (Three.js mannequin + t-shirt, sizes from the size chart) |
| T-shirt mockups | `components/TeeMockup.tsx` (SVG, regular fit, optional hanger) |
| WhatsApp checkout | `app/api/orders/route.ts` → saves the order, reserves stock, returns a `wa.me` link |
| Admin panel | `app/admin/…` + `app/api/admin/…` (login protected by `middleware.ts`) |
| Database | `data/db.json` (JSON file) + uploaded images in `data/uploads/` |

**Stock:** placing an order reserves stock; cancelling (or deleting an unpaid order) puts it back.
Sold-out sizes can't be ordered. Admin → Products → *Remove sold-out items* hides or deletes them,
and Website content → General can hide sold-out products automatically.

## Going live (Vercel + Supabase)

The live site runs on **Vercel**; shop data and uploaded images live in **Supabase**.
Locally nothing changes — without the Supabase keys it uses `data/` on your computer.

### 1. Supabase (database + image storage)
1. Create a project at https://supabase.com — choose region **Central EU (Frankfurt)** (matches `vercel.json` → `fra1`).
2. **Project Settings → Database → Connection string → “Transaction pooler”** (port 6543). Copy it and put your
   database password in place of `[YOUR-PASSWORD]` → this is `DATABASE_URL`.
3. **Project Settings → API**: copy the **Project URL** → `SUPABASE_URL`, and the **service_role** secret →
   `SUPABASE_SERVICE_ROLE_KEY` (keep this secret).

You don't need to create tables or buckets: on the first visit the site creates the `mpopi_store` table
(with Row Level Security on) and a public `media` bucket for images, and loads the starter products.

### 2. GitHub
Push this folder to a **private** GitHub repository (`.env.local` and `data/` are ignored and never uploaded).

### 3. Vercel
1. https://vercel.com → **Add New → Project** → import the GitHub repository (framework: Next.js, detected automatically).
2. **Environment Variables** — add for *Production* (and *Preview* if you like):

   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | a new long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) |
   | `ADMIN_EMAIL` | the client's admin email |
   | `ADMIN_PASSWORD` | a strong password (used once, to create the first admin) |
   | `DATABASE_URL` | Supabase transaction-pooler URL |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `NEXT_PUBLIC_SITE_URL` | `https://www.your-domain.co.za` |
3. **Deploy.** Then open `https://<project>.vercel.app/admin`, sign in, and in **Website content → General**
   set the real **WhatsApp number**. Replace the demo products/photos as needed.

### 4. Domain
Vercel → Project → **Settings → Domains** → add `your-domain.co.za` and `www.your-domain.co.za`.
At the domain registrar, add the DNS records Vercel shows (usually an `A` record `76.76.21.21` for the root
and a `CNAME` `cname.vercel-dns.com` for `www`). SSL is automatic. Update `NEXT_PUBLIC_SITE_URL` and redeploy.

Every push to the `main` branch redeploys the live site automatically.

### Backups
Supabase backs up the database daily on paid plans. On the free plan, export regularly:
Supabase → **Table editor → mpopi_store → Export**, or `pg_dump "$DATABASE_URL" > backup.sql`.

## Brand assets

`python scripts/process-assets.py` rebuilds the logo, prints, icon and retouched photos from
`assets-src/`. The MPOPI wordmark uses the font embedded in the client's logo PDF.
The Hiswona… print is a stand-in (Playfair Display, OFL) — upload the real artwork in the admin.
