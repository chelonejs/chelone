import { links } from "./constants";
import { CtaButton } from "./cta-button";
import { Reveal, RevealItem } from "./reveal";

/** Closing full-bleed brand-gradient panel with the primary "Get started" CTA. */
export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="rounded-[2.5rem] bg-brand-gradient px-6 py-24 text-center shadow-lg shadow-indigo-500/20 md:py-32">
          <RevealItem
            as="h2"
            className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Generate a beautiful admin panel in just a few lines of code.
          </RevealItem>
          <RevealItem
            as="p"
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/80"
          >
            Then customize every detail to fit your unique requirements.
          </RevealItem>
          <RevealItem className="mt-9 flex justify-center">
            <CtaButton to={links.install} variant="white">
              Get started
            </CtaButton>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}
