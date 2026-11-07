import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// All fonts are bundled with the site (OFL licence): builds never depend on Google Fonts
// and visitors' browsers never contact a third party for them.
const grotesk = localFont({ src: "./fonts/SpaceGrotesk.ttf", variable: "--font-grotesk", weight: "300 700", display: "swap" });
const manrope = localFont({ src: "./fonts/Manrope.ttf", variable: "--font-manrope", weight: "200 800", display: "swap" });
const playfair = localFont({
  src: "./fonts/PlayfairDisplay-Italic.ttf",
  variable: "--font-playfair",
  style: "italic",
  weight: "400 900",
  display: "swap",
});

// Every page is rendered per request so it can carry the CSP nonce set in middleware.ts.
export const dynamic = "force-dynamic";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "MPOPI… | Soft feelings, loud tees", template: "%s | MPOPI…" },
  description:
    "MPOPI… and Hiswona… — proudly South African t-shirts. Try every tee in our 3D fitting room and order easily on WhatsApp.",
  openGraph: {
    type: "website",
    siteName: "MPOPI…",
    images: ["/photos/look-white-set.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f0eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${grotesk.variable} ${manrope.variable} ${playfair.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
