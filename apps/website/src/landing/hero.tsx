import { links } from "./constants";
import { CtaButton, GhostButton } from "./cta-button";
import { DashboardMockup } from "./dashboard-mockup";
import { Reveal, RevealItem } from "./reveal";
import { BezelPanel, Eyebrow } from "./section";

/** Hero: eyebrow, headline, sub-copy, primary CTAs, and the dashboard mockup. */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-36">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal immediate>
          <Eyebrow>Open source · Zod-first · shadcn registry</Eyebrow>

          <RevealItem
            as="h1"
            className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-[-0.02em] text-foreground md:text-7xl"
          >
            Point at a Zod schema.{" "}
            <span className="text-brand-gradient">Ship an admin panel.</span>
          </RevealItem>

          <RevealItem
            as="p"
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            Chelone is a framework-agnostic admin engine with React and Vue
            adapters — typed records and zero-boilerplate validation from your
            schema, composed with production-ready shadcn blocks.
          </RevealItem>

          <RevealItem className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <CtaButton to={links.install}>Get started</CtaButton>
            <GhostButton to={links.demo} hardNav>
              Live demo
            </GhostButton>
          </RevealItem>
        </Reveal>

        {/* Dashboard mockup in a double-bezel panel */}
        <Reveal delay={0.1} className="mt-16" immediate>
          <BezelPanel>
            <DashboardMockup />
          </BezelPanel>
        </Reveal>
      </div>
    </section>
  );
}
