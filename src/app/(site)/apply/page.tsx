import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Apply to sell",
  description:
    "Artists can apply for a booth at the Athens Holiday Market. Applications open on Labor Day.",
};

export default function ApplyPage() {
  return (
    <ComingSoon
      eyebrow="Vendor applications"
      title="Come sell with us."
      body="Booth applications for the 2026 market open on Labor Day. The online application — with guidelines and photo uploads — is on its way. Subscribe on the home page and check the artist box to be notified the moment it opens."
      color="var(--color-fuchsia)"
    />
  );
}
