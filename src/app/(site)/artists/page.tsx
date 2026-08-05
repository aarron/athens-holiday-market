import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Artists",
  description:
    "Meet the local artists and makers of the Athens Holiday Market. Full lineup and individual maker pages coming soon.",
};

export default function ArtistsPage() {
  return (
    <ComingSoon
      eyebrow="The lineup"
      title="Meet the makers."
      body="The full roster of juried artists — with photos of their work and links to their shops — lands closer to the market. Check back soon, or subscribe on the home page to be the first to see it."
      color="var(--color-teal)"
    />
  );
}
