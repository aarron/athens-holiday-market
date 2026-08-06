import type { Metadata } from "next";
import { Jost, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  weight: ["400", "500", "600", "700", "800"],
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
    <html lang="en" className={`${jost.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
