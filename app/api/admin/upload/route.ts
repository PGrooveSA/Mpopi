import { NextResponse } from "next/server";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { saveImage } from "@/lib/media";
import { adminRoute, bad } from "@/lib/api";

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Upload an image. kind=photo → resized WebP; kind=print → transparent WebP kept crisp.
 * Stored in Supabase Storage in production (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), otherwise on local disk.
 */
export const POST = adminRoute(async (req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind") === "print" ? "print" : "photo";
  if (!(file instanceof File)) return bad("No file received.");
  if (file.size > MAX_BYTES) return bad("Image is too large (max 12 MB).");
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) return bad("Please upload a PNG, JPG or WebP image.");

  const input = Buffer.from(await file.arrayBuffer());
  let img = sharp(input, { failOn: "error" }).rotate();
  if (kind === "print") {
    img = img.trim({ threshold: 1 }).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 100 });
  } else {
    img = img.resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 });
  }
  const out = await img.toBuffer();
  const name = `${kind}-${nanoid(12)}.webp`;

  return NextResponse.json({ url: await saveImage(name, out) });
});
