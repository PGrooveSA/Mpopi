"use client";
import { useRef, useState } from "react";
import { SpinnerGap as Loader2, UploadSimple as Upload, X } from "@phosphor-icons/react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`glass rounded-[1.75rem] p-5 sm:p-6 ${className}`}>{children}</section>;
}

/** Shrinks big phone photos in the browser first (hosting limits uploads to ~4.5 MB). Keeps transparency. */
async function shrink(file: File, maxSide = 2400, maxBytes = 3.5 * 1024 * 1024): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= maxBytes) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.92));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, kind: "photo" | "print" = "photo") {
  const fd = new FormData();
  fd.append("file", await shrink(file));
  fd.append("kind", kind);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

/** Single image picker with preview + upload. */
export function ImageField({
  value,
  onChange,
  kind = "photo",
  label,
  className = "",
  aspect = "aspect-square",
  presets,
}: {
  value?: string;
  onChange: (url: string) => void;
  kind?: "photo" | "print";
  label?: string;
  className?: string;
  aspect?: string;
  presets?: { url: string; label: string }[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadImage(f, kind));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={className}>
      {label && <p className="label">{label}</p>}
      <div
        className={`group relative ${aspect} cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-ink/15 bg-white/50 transition hover:border-hot/50`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
        style={kind === "print" ? { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23000' fill-opacity='.05'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E\")" } : undefined}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`h-full w-full ${kind === "print" ? "object-contain p-2" : "object-cover"}`} />
        ) : (
          <div className="grid h-full place-items-center p-2 text-center text-xs font-semibold text-ink-soft">
            <span>
              <Upload className="mx-auto mb-1 h-5 w-5" /> Upload
            </span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-hot" />
          </div>
        )}
        {value && !busy && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 opacity-0 shadow transition group-hover:opacity-100"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
      {presets && presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              type="button"
              key={p.url}
              onClick={() => onChange(p.url)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${value === p.url ? "bg-ink text-white" : "bg-white/70 text-ink-soft hover:bg-white"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs font-semibold text-hot-deep">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-hot" : "bg-ink/15"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const show = (text: string, type: "ok" | "err" = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3200);
  };
  const node = msg ? (
    <div
      role="status"
      className={`fixed right-4 bottom-4 z-50 animate-fade-up rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${msg.type === "ok" ? "bg-emerald-600" : "bg-hot-deep"}`}
    >
      {msg.text}
    </div>
  ) : null;
  return { show, node };
}

export const PRINT_PRESETS = [
  { url: "/prints/mpopi-hot.png", label: "MPOPI hot pink" },
  { url: "/prints/mpopi-soft.png", label: "MPOPI soft pink" },
  { url: "/brand/bear.png", label: "Bear only" },
  { url: "/prints/hiswona-brown.png", label: "Hiswona brown" },
  { url: "/prints/hiswona-cream.png", label: "Hiswona cream" },
];
