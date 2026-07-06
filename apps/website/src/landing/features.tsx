import { cn } from "@/lib/utils";
import {
  COL_START,
  features,
  isBig,
  ROW_START,
  sizeClasses,
} from "./features.data";
import { FEATURE_VISUALS } from "./features-visuals";
import { Reveal, RevealItem } from "./reveal";
import { Eyebrow, Heading, Lead, Section } from "./section";

/** "Beyond UI Elements" — asymmetric tetris bento of the kit's headline features. */
export function Features() {
  return (
    <Section>
      <Reveal className="mx-auto max-w-3xl text-center">
        <Eyebrow>All the Essentials</Eyebrow>
        <Heading>
          Beyond <span className="text-brand-gradient">UI Elements</span>
        </Heading>
        <Lead>
          With Chelone, all the essential features come preconfigured with
          proven best practices. Spend less time on repetitive setup and more on
          what makes your app unique: your business logic.
        </Lead>
      </Reveal>

      <Reveal className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[13rem] md:grid-cols-3">
        {features.map((f) => {
          const Visual = FEATURE_VISUALS[f.title];
          const big = isBig(f.size);
          return (
            <RevealItem
              key={f.title}
              className={cn(
                "bento-card group relative flex overflow-hidden rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-border",
                f.flexRow ? "flex-row justify-between" : "flex-col",
                COL_START[f.col],
                ROW_START[f.row],
                sizeClasses(f.size),
              )}
            >
              <div className="flex flex-col gap-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm shadow-indigo-500/20">
                  <f.icon
                    className={cn(big ? "size-6" : "size-5")}
                    strokeWidth={1.5}
                  />
                </span>
                <h3
                  className={cn(
                    "mt-2 font-semibold leading-tight tracking-tight text-foreground",
                    big ? "text-xl" : "text-base",
                  )}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
              {Visual && (
                <div
                  className={cn(
                    "min-h-0",
                    f.flexRow ? "mx-auto self-center" : "mt-4 flex-1",
                  )}
                >
                  <Visual />
                </div>
              )}
            </RevealItem>
          );
        })}
      </Reveal>
    </Section>
  );
}
