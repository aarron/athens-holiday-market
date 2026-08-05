import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Snow } from "@/components/snow";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Snow />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
