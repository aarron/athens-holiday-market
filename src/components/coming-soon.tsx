import { Flower } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

/** On-brand placeholder for Phase 1 pages not yet built. */
export function ComingSoon({
  eyebrow,
  title,
  body,
  color = "var(--color-fuchsia)",
}: {
  eyebrow: string;
  title: string;
  body: string;
  color?: string;
}) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
      <Flower size={64} color={color} spin />
      <p
        className="mt-8 font-display text-sm font-bold uppercase tracking-[0.18em]"
        style={{ color }}
      >
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-6xl">{title}</h1>
      <p className="mt-5 max-w-xl text-lg text-ink-soft">{body}</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="ink" size="lg">
          Back home
        </ButtonLink>
      </div>
    </section>
  );
}
