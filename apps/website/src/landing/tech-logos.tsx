import { Reveal, RevealItem } from "./reveal";
import { Eyebrow, Heading, Lead, Section } from "./section";
import { techLogos } from "./tech-logos.data";

/** "The Stack" — grid of the libraries Chelone is built on. */
export function TechLogos() {
  return (
    <Section>
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>The Stack</Eyebrow>
        <Heading>
          Built on tools you <span className="text-brand-gradient">trust</span>
        </Heading>
        <Lead>
          Chelone leverages first-class libraries, acclaimed by the React
          community for their robustness, documentation and performance.
        </Lead>
      </Reveal>

      <Reveal className="mx-auto mt-14 flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-10">
        {techLogos.map((logo) => (
          <RevealItem
            key={logo.label}
            className="group flex flex-col items-center gap-2"
          >
            <img
              src={logo.src}
              alt={logo.label}
              width={56}
              height={56}
              // Uniform theme-adaptive silhouette: brightness-0 forces any source
              // color to black (visible on light), dark:invert flips it to white
              // (visible on dark) — so every logo reads in both modes.
              className="size-14 opacity-65 brightness-0 transition-opacity duration-300 group-hover:opacity-100 dark:invert"
            />
            <span className="text-xs font-medium text-muted-foreground">
              {logo.label}
            </span>
          </RevealItem>
        ))}
      </Reveal>
    </Section>
  );
}
