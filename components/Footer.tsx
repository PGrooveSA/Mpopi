import Link from "next/link";
import type { Settings } from "@/lib/types";
import { whatsappLink } from "@/lib/shop";

export default function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="container-x mt-24 pb-8">
      <div className="glass-dark overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="MPOPI…" className="h-10 w-auto" />
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Proudly South African tees, made to feel like a hug. Order on WhatsApp — a real person will help you.
            </p>
            <a
              href={whatsappLink(settings.whatsappNumber, "Hi MPOPI! I have a question 😊")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-6"
            >
              Chat on WhatsApp
            </a>
          </div>
          <FooterCol
            title="Shop"
            links={[
              ["/shop", "All tees"],
              ["/shop?collection=mpopi", "MPOPI…"],
              ["/shop?collection=hiswona", "Hiswona…"],
              ["/fitting-room", "3D Fitting Room"],
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              ["/faq", "FAQ & Delivery"],
              ["/faq#size-guide", "Size guide"],
              ["/about", "Our story"],
            ]}
          />
          <div>
            <h3 className="mb-4 text-xs font-bold tracking-[0.2em] text-blush uppercase">Follow</h3>
            <ul className="space-y-2 text-sm text-white/75">
              {settings.socials.instagram && (
                <li>
                  <a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    Instagram
                  </a>
                </li>
              )}
              {settings.socials.tiktok && (
                <li>
                  <a href={settings.socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    TikTok
                  </a>
                </li>
              )}
              {settings.socials.facebook && (
                <li>
                  <a href={settings.socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    Facebook
                  </a>
                </li>
              )}
              {settings.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-white">
                    {settings.contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© {year} MPOPI… All rights reserved.</span>
          <span>Made with 💗 in South Africa</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-bold tracking-[0.2em] text-blush uppercase">{title}</h3>
      <ul className="space-y-2 text-sm text-white/75">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
