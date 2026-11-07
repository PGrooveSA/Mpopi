import { promises as fs } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/store";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const name = parts.join("/");
  if (!/^[\w-]+\.(webp|png|jpe?g)$/i.test(name)) return new Response("Not found", { status: 404 });
  try {
    const file = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
