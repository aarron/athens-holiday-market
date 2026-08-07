import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

// Display face for headlines + buttons (see --font-display in globals.css).
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Handmade gifts in the heart of Athens`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [
    "Athens Holiday Market",
    "Athens GA holiday market",
    "handmade gifts Athens",
    "Big City Bread",
    "local artists Athens",
    "craft market Athens Georgia",
    "shop local holidays",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — Handmade gifts in the heart of Athens`,
    description: site.description,
    url: site.url,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${inter.variable} h-full`}>
      <head>
        {/* Reflect the saved motion preference before first paint so animations
            never flash on for someone who chose "Reduce motion". */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem('ahm-motion');var off=m==='off'||(m===null&&matchMedia('(prefers-reduced-motion: reduce)').matches);document.documentElement.dataset.motion=off?'off':'on'}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
