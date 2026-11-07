import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", weight: ["400", "500", "600", "700"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
// Served from the project (OFL licence) — Google Fonts returns a response for the italic-only
// request that breaks the build on Vercel.
const playfair = localFont({
  src: "./fonts/PlayfairDisplay-Italic.ttf",
  variable: "--font-playfair",
  style: "italic",
  weight: "400 900",
  display: "swap",
});

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
