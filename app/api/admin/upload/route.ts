import { NextResponse } from "next/server";
import sharp, { type Metadata } from "sharp";
import { nanoid } from "nanoid";
import { saveImage } from "@/lib/media";
import { adminRoute, bad } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import { rateLimit, logSecurity } from "@/lib/security";

const MAX_BYTES = 12 * 1024 * 1024; // hosting caps requests at ~4.5 MB; the admin shrinks photos first
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"]);
const MAX_PIXELS = 40_000_000; // ~ 8000×5000 — blocks "decompression bomb" images

/**
 * Upload an image. The file is decoded and re-encoded as WebP by sharp, which
 *  - checks the real file contents (not the name or the browser's claimed type),
 *  - strips metadata (GPS location etc.) and anything hidden in the file,
 *  - never stores the original bytes, so SVG/HTML/script uploads are impossible.
 */
export const POST = adminRoute(async (req: Request) => {
  const admin = await getAdmin();
  const rl = await rateLimit(`upload:${admin?.id}`, 60, 10 * 60);
  if (!rl.ok) {
    await logSecurity("rate_limited", req, "too many uploads");
    return bad("Too many uploads. Please wait a few minutes.", 429);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "print" ? "print" : "photo";
  if (!(file instanceof File)) return bad("No file received.");
  const reject = async (why: string) => {
    await logSecurity("upload_rejected", req, `${why} (name=${file.name.slice(0, 60)}, type=${file.type}, size=${file.size})`);
    return bad(why);
  };
  if (file.size === 0) return reject("The file is empty.");
  if (file.size > MAX_BYTES) return reject("Image is too large (max 12 MB).");
  if (!/^image\/(png|jpe?g|webp|gif|avif|heic|heif)$/.test(file.type)) return reject("Please upload a PNG, JPG or WebP image.");

  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    return reject("That file isn't a valid image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) return reject("Please upload a PNG, JPG or WebP image.");
  if (!meta.width || !meta.height || meta.width * meta.height > MAX_PIXELS) return reject("Image dimensions are too large.");

  let img = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate();
  if (kind === "print") {
    img = img.trim({ threshold: 1 }).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 100 });
  } else {
    img = img.resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 });
  }
  let out: Buffer;
  try {
    out = await img.toBuffer();
  } catch {
    return reject("That image couldn't be processed.");
  }
  const name = `${kind}-${nanoid(12)}.webp`;
  return NextResponse.json({ url: await saveImage(name, out) });
});
