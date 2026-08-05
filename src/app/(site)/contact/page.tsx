import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Athens Holiday Market team, and find directions to the Big City Bread courtyard in Athens, GA.",
};

export default function ContactPage() {
  return (
    <ComingSoon
      eyebrow="Say hello"
      title="Get in touch."
      body="A contact form and directions to the Big City Bread courtyard are coming soon. In the meantime, email us at bcbartcollective@soupstudios.com."
      color="var(--color-berry)"
    />
  );
}
