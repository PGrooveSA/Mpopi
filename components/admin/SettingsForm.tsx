"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, SpinnerGap as Loader2, Plus, FloppyDisk as Save, Trash as Trash2 } from "@phosphor-icons/react";
import type { Collection, Settings } from "@/lib/types";
import { Card, ImageField, PageHeader, Toggle, useToast, uploadImage } from "./ui";

const TABS = [
  ["general", "General"],
  ["home", "Home page"],
  ["collections", "Collections"],
  ["delivery", "Delivery"],
  ["sizes", "Size chart"],
  ["faq", "FAQ"],
  ["lookbook", "Lookbook"],
  ["about", "About page"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function SettingsForm({ initialSettings, initialCollections }: { initialSettings: Settings; initialCollections: Collection[] }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initialSettings);
  const [cols, setCols] = useState(initialCollections);
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(initialSettings) || JSON.stringify(cols) !== JSON.stringify(initialCollections);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((d) => ({ ...d, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: s, collections: cols }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.show("Website updated");
      router.refresh();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not save", "err");
    } finally {
      setSaving(false);
    }
  };

  const move = <T,>(arr: T[], i: number, d: number) => {
    const a = [...arr];
    const j = i + d;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };

  return (
    <div className="pb-20">
      <PageHeader title="Website content" subtitle="Everything customers see — changes go live as soon as you save.">
        <button onClick={save} disabled={saving || !dirty} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Save changes" : "Saved"}
        </button>
      </PageHeader>

      <div className="glass no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-[1.5rem] p-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${tab === k ? "bg-ink text-white" : "text-ink-soft hover:bg-white/70"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <Card className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">WhatsApp number for orders *</label>
              <input className="input" value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} placeholder="27821234567" />
              <p className="mt-1 text-xs text-ink-soft">International format without + or spaces, e.g. 27821234567 for 082 123 4567.</p>
            </div>
            <div>
              <label className="label">Store name</label>
              <input className="input" value={s.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </div>
            <div>
              <label className="label">Contact email</label>
              <input className="input" type="email" value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            </div>
            <div>
              <label className="label">Free delivery over (R, 0 = off)</label>
              <input className="input" type="number" min={0} value={s.freeDeliveryOver} onChange={(e) => set("freeDeliveryOver", Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Announcement bar</label>
              <input className="input" value={s.announcement} onChange={(e) => set("announcement", e.target.value)} placeholder="Leave empty to hide" />
            </div>
            <div>
              <label className="label">Instagram link</label>
              <input className="input" value={s.socials.instagram} onChange={(e) => set("socials", { ...s.socials, instagram: e.target.value })} placeholder="https://instagram.com/…" />
            </div>
            <div>
              <label className="label">TikTok link</label>
              <input className="input" value={s.socials.tiktok} onChange={(e) => set("socials", { ...s.socials, tiktok: e.target.value })} placeholder="https://tiktok.com/@…" />
            </div>
            <div>
              <label className="label">Facebook link</label>
              <input className="input" value={s.socials.facebook} onChange={(e) => set("socials", { ...s.socials, facebook: e.target.value })} placeholder="https://facebook.com/…" />
            </div>
          </div>
          <div className="rounded-2xl bg-white/50 p-4">
            <Toggle checked={s.hideSoldOut} onChange={(v) => set("hideSoldOut", v)} label="Automatically hide sold-out products from the shop" />
            <p className="mt-2 pl-14 text-xs text-ink-soft">When off, sold-out products stay visible with a “Sold out” badge (good for hype). Sold-out sizes can never be ordered either way.</p>
          </div>
        </Card>
      )}

      {tab === "home" && (
        <Card>
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div>
                <label className="label">Small label above the headline</label>
                <input className="input" value={s.hero.eyebrow} onChange={(e) => set("hero", { ...s.hero, eyebrow: e.target.value })} />
              </div>
              <div>
                <label className="label">Headline (last two words get the gradient)</label>
                <input className="input" value={s.hero.title} onChange={(e) => set("hero", { ...s.hero, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Intro text</label>
                <textarea className="input min-h-28" value={s.hero.subtitle} onChange={(e) => set("hero", { ...s.hero, subtitle: e.target.value })} />
              </div>
            </div>
            <ImageField label="Hero photo (portrait works best)" aspect="aspect-[4/5]" value={s.hero.image} onChange={(url) => set("hero", { ...s.hero, image: url })} />
          </div>
        </Card>
      )}

      {tab === "collections" && (
        <div className="space-y-4">
          {cols.map((c, i) => (
            <Card key={i}>
              <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Name</label>
                    <input className="input" value={c.name} onChange={(e) => setCols(cols.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                  </div>
                  <div>
                    <label className="label">Accent colour</label>
                    <input type="color" className="h-[46px] w-full rounded-2xl border border-white bg-white/60 p-1" value={c.accent} onChange={(e) => setCols(cols.map((x, k) => (k === i ? { ...x, accent: e.target.value } : x)))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Tagline</label>
                    <input className="input" value={c.tagline} onChange={(e) => setCols(cols.map((x, k) => (k === i ? { ...x, tagline: e.target.value } : x)))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Description</label>
                    <textarea className="input" value={c.description} onChange={(e) => setCols(cols.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} />
                  </div>
                  <p className="text-xs text-ink-soft sm:col-span-2">
                    Web address: /shop?collection={c.slug || "(new)"}
                    {c.slug && " · Collections that still have products can't be removed."}
                  </p>
                </div>
                <div>
                  <ImageField label="Cover photo" aspect="aspect-[4/3]" value={c.image} onChange={(url) => setCols(cols.map((x, k) => (k === i ? { ...x, image: url } : x)))} />
                  <button onClick={() => setCols(cols.filter((_, k) => k !== i))} className="mt-3 text-xs font-bold text-hot-deep hover:underline">
                    Remove collection
                  </button>
                </div>
              </div>
            </Card>
          ))}
          <button onClick={() => setCols([...cols, { slug: "", name: "", tagline: "", description: "", image: "", accent: "#F0609A" }])} className="btn-glass">
            <Plus className="h-4 w-4" /> Add collection
          </button>
        </div>
      )}

      {tab === "delivery" && (
        <Card className="space-y-3">
          {s.deliveryOptions.map((d, i) => (
            <div key={i} className="grid gap-3 rounded-2xl bg-white/50 p-4 sm:grid-cols-[1.2fr_2fr_110px_auto]">
              <input className="input" value={d.name} placeholder="Name" onChange={(e) => set("deliveryOptions", s.deliveryOptions.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" value={d.description} placeholder="e.g. 2–4 working days" onChange={(e) => set("deliveryOptions", s.deliveryOptions.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} />
              <input className="input" type="number" min={0} value={d.price} onChange={(e) => set("deliveryOptions", s.deliveryOptions.map((x, k) => (k === i ? { ...x, price: Number(e.target.value) } : x)))} aria-label="Price" />
              <button onClick={() => set("deliveryOptions", s.deliveryOptions.filter((_, k) => k !== i))} className="grid h-11 w-11 place-items-center rounded-full bg-white/70 text-hot-deep" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="sm:col-span-4">
                <Toggle checked={d.requiresAddress} onChange={(v) => set("deliveryOptions", s.deliveryOptions.map((x, k) => (k === i ? { ...x, requiresAddress: v } : x)))} label="Customer must enter a street address" />
              </div>
            </div>
          ))}
          <button onClick={() => set("deliveryOptions", [...s.deliveryOptions, { id: "", name: "", description: "", price: 0, requiresAddress: true }])} className="btn-glass">
            <Plus className="h-4 w-4" /> Add delivery option
          </button>
        </Card>
      )}

      {tab === "sizes" && (
        <Card>
          <p className="mb-4 text-sm text-ink-soft">Garment measurements in cm. The 3D fitting room uses these numbers to show how each size fits.</p>
          <div className="overflow-x-auto">
            <table className="w-full max-w-xl text-sm">
              <thead className="text-xs text-ink-soft">
                <tr>
                  <th className="pb-2 text-left">Size</th>
                  <th className="pb-2">Chest (all round)</th>
                  <th className="pb-2">Length</th>
                  <th className="pb-2">Sleeve</th>
                </tr>
              </thead>
              <tbody>
                {s.sizeChart.map((r, i) => (
                  <tr key={r.size}>
                    <td className="py-1 font-bold">{r.size}</td>
                    {(["chest", "length", "sleeve"] as const).map((k) => (
                      <td key={k} className="px-1 py-1">
                        <input
                          type="number"
                          className="input !py-2 text-center"
                          value={r[k]}
                          onChange={(e) => set("sizeChart", s.sizeChart.map((x, j) => (j === i ? { ...x, [k]: Number(e.target.value) } : x)))}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "faq" && (
        <Card className="space-y-3">
          {s.faqs.map((f, i) => (
            <div key={i} className="rounded-2xl bg-white/50 p-4">
              <div className="flex gap-2">
                <input className="input font-bold" value={f.q} placeholder="Question" onChange={(e) => set("faqs", s.faqs.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
                <button onClick={() => set("faqs", move(s.faqs, i, -1))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/70" aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={() => set("faqs", move(s.faqs, i, 1))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/70" aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button onClick={() => set("faqs", s.faqs.filter((_, k) => k !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/70 text-hot-deep" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea className="input mt-2" value={f.a} placeholder="Answer" onChange={(e) => set("faqs", s.faqs.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
            </div>
          ))}
          <button onClick={() => set("faqs", [...s.faqs, { q: "", a: "" }])} className="btn-glass">
            <Plus className="h-4 w-4" /> Add question
          </button>
        </Card>
      )}

      {tab === "lookbook" && (
        <Card>
          <p className="mb-4 text-sm text-ink-soft">Photos shown in the “Worn by you” gallery on the home page.</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {s.lookbook.map((l, i) => (
              <div key={l.src + i} className="rounded-2xl bg-white/50 p-2">
                <ImageField aspect="aspect-[4/5]" value={l.src} onChange={(url) => set("lookbook", url ? s.lookbook.map((x, k) => (k === i ? { ...x, src: url } : x)) : s.lookbook.filter((_, k) => k !== i))} />
                <input className="input mt-2 !py-2 text-xs" value={l.caption} placeholder="Caption" onChange={(e) => set("lookbook", s.lookbook.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))} />
                <div className="mt-2 flex justify-between">
                  <button onClick={() => set("lookbook", move(s.lookbook, i, -1))} className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold" aria-label="Move earlier">
                    ←
                  </button>
                  <button onClick={() => set("lookbook", s.lookbook.filter((_, k) => k !== i))} className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-hot-deep">
                    Remove
                  </button>
                  <button onClick={() => set("lookbook", move(s.lookbook, i, 1))} className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold" aria-label="Move later">
                    →
                  </button>
                </div>
              </div>
            ))}
            <label className="grid aspect-[4/5] cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-ink/15 bg-white/50 text-sm font-semibold text-ink-soft hover:border-hot/50">
              <span className="text-center">
                <Plus className="mx-auto h-6 w-6" /> Add photos
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  const files = [...(e.target.files ?? [])].slice(0, 12);
                  try {
                    const urls = await Promise.all(files.map((f) => uploadImage(f)));
                    setS((d) => ({ ...d, lookbook: [...d.lookbook, ...urls.map((src) => ({ src, caption: "" }))] }));
                  } catch (err) {
                    toast.show(err instanceof Error ? err.message : "Upload failed", "err");
                  }
                }}
              />
            </label>
          </div>
        </Card>
      )}

      {tab === "about" && (
        <Card>
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div>
                <label className="label">Headline</label>
                <input className="input" value={s.about.title} onChange={(e) => set("about", { ...s.about, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Story (leave an empty line between paragraphs)</label>
                <textarea className="input min-h-64" value={s.about.body} onChange={(e) => set("about", { ...s.about, body: e.target.value })} />
              </div>
            </div>
            <ImageField label="Photo" aspect="aspect-[4/5]" value={s.about.image} onChange={(url) => set("about", { ...s.about, image: url })} />
          </div>
        </Card>
      )}

      {dirty && (
        <div className="glass-strong fixed right-4 bottom-4 left-4 z-40 flex items-center justify-between gap-3 rounded-2xl p-3 pl-5 lg:left-auto lg:w-96">
          <span className="text-sm font-semibold">You have unsaved changes</span>
          <button onClick={save} disabled={saving} className="btn-primary !py-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      )}
      {toast.node}
    </div>
  );
}
