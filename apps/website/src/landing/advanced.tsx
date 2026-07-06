import { Check } from "lucide-react";
import { advancedItems } from "./advanced.data";
import { links } from "./constants";
import { CtaButton } from "./cta-button";
import { DataTableMockup } from "./data-table-mockup";
import { Reveal, RevealItem } from "./reveal";
import { BezelPanel, Heading, Lead, Section } from "./section";

/** "Advanced Capabilities" split: checklist of features beside a data-table mockup. */
export function Advanced() {
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <Reveal>
          <Heading>
            Advanced <span className="text-brand-gradient">Capabilities</span>
          </Heading>
          <Lead>
            Beyond the basics, Chelone offers sophisticated features to reduce
            development costs and enhance the developer experience.
          </Lead>

          <ul className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {advancedItems.map((item) => (
              <RevealItem as="li" key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </RevealItem>
            ))}
          </ul>

          <RevealItem className="mt-9">
            <CtaButton to={links.install}>Learn More</CtaButton>
          </RevealItem>
        </Reveal>

        {/* Mockup */}
        <Reveal delay={0.1}>
          <BezelPanel>
            <DataTableMockup />
          </BezelPanel>
        </Reveal>
      </div>
    </Section>
  );
}
