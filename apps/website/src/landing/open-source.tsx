import { cn } from "@/lib/utils";
import { insetCard } from "./constants";
import { Reveal } from "./reveal";
import { BezelPanel, Heading, Lead, Section } from "./section";

const stats = [
  { value: "40+", label: "Components" },
  { value: "15+", label: "Blocks" },
  { value: "100%", label: "Open source (MIT)" },
];

/** "Open source, Open Code" headline above a row of three brand-gradient stat cards. */
export function OpenSource() {
  return (
    <Section>
      <Reveal className="mx-auto max-w-3xl text-center">
        <Heading>
          Open source, <span className="text-brand-gradient">Open Code</span>
        </Heading>
        <Lead>
          Don&apos;t get locked-in to proprietary, black-box solutions. With
          Chelone you always have 100% control over your project.
        </Lead>
      </Reveal>

      <Reveal className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <BezelPanel key={s.label}>
            <div className={cn("px-6 py-10 text-center", insetCard)}>
              <p className="text-5xl font-bold text-brand-gradient">
                {s.value}
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {s.label}
              </p>
            </div>
          </BezelPanel>
        ))}
      </Reveal>
    </Section>
  );
}
