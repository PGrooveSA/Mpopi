import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { UPLOAD_DIR } from "./store";

/**
 * Saves an uploaded image and returns its public URL.
 *  - Production (Vercel): Supabase Storage, public bucket "media" (created automatically)
 *  - Local: DATA_DIR/uploads, served by /api/media/…
 */
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET || "media";

const g = globalThis as unknown as { __mpopiBucket?: Promise<void> };

function ensureBucket() {
  g.__mpopiBucket ??= (async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 12 * 1024 * 1024, allowed_mime_types: ["image/webp", "image/png", "image/jpeg"] }),
    });
    // 409 / "already exists" is fine
    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      if (!/already exists|Duplicate/i.test(text)) throw new Error(`Could not create storage bucket: ${text}`);
    }
  })().catch((e) => {
    g.__mpopiBucket = undefined;
    throw e;
  });
  return g.__mpopiBucket;
}

export const mediaMode = SUPABASE_URL && SERVICE_KEY ? "supabase" : "local";

export async function saveImage(name: string, data: Buffer, contentType = "image/webp"): Promise<string> {
  if (mediaMode === "supabase") {
    await ensureBucket();
    const key = `uploads/${name}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": contentType,
        "Cache-Control": "max-age=31536000",
        "x-upsert": "false",
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Upload to storage failed: ${await res.text()}`);
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), data);
  return `/api/media/${name}`;
}
