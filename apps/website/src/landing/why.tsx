import { Reveal, RevealItem } from "./reveal";
import { Heading, Section } from "./section";
import { whyReasons } from "./why.data";

/** "Why choose Chelone?" — three-column grid of reason cards. */
export function Why() {
  return (
    <Section>
      <Reveal className="mx-auto max-w-3xl text-center">
        <Heading>
          Why choose <span className="text-brand-gradient">Chelone</span>?
        </Heading>
      </Reveal>

      <Reveal className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {whyReasons.map((r) => (
          <RevealItem
            key={r.title}
            className="rounded-xl border border-border/60 bg-card p-6 transition-colors duration-300 hover:border-border"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm shadow-indigo-500/20">
              <r.icon className="size-5" strokeWidth={1.5} />
            </span>
            <h3 className="mt-4 font-semibold leading-tight text-foreground">
              {r.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {r.description}
            </p>
          </RevealItem>
        ))}
      </Reveal>
    </Section>
  );
}
