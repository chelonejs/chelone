import {
  ArrowDown,
  Database,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { insetCard, links } from "./constants";
import { CtaButton } from "./cta-button";
import { Reveal, RevealItem } from "./reveal";
import {
  BezelPanel,
  Eyebrow,
  Heading,
  Lead,
  LogoChip,
  Section,
} from "./section";

const backendLogos = [
  { label: "Supabase", src: "/img/supabase-logo-icon.svg" },
  { label: "Appwrite", src: "/img/appwrite-logo.svg" },
  { label: "Firebase", src: "/img/firebase-logo.svg" },
  { label: "Strapi", src: "/img/strapi-logo.svg" },
  { label: "Hasura", src: "/img/hasura-logo.svg" },
];

interface FlowBoxProps {
  label: string;
  icon: LucideIcon;
  /** Highlight as the brand-gradient node (the dataProvider in the diagram). */
  brand?: boolean;
}

/** A single labelled node in the App → dataProvider → Backend flow diagram. */
function FlowBox({ label, icon: Icon, brand }: FlowBoxProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
        brand
          ? "bg-brand-gradient font-semibold text-white shadow-sm shadow-indigo-500/20"
          : "border border-border/60 bg-card font-medium text-foreground",
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {label}
    </div>
  );
}

/** Monospace code chip used as a connector caption in the flow diagram. */
function MonoPill({ children }: { children: string }) {
  return (
    <span className="rounded-md border border-border/60 bg-muted/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
      {children}
    </span>
  );
}

/** "Connect to Any Backend" split: copy + backend chips beside a flow diagram. */
export function Backends() {
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy + logo chips */}
        <Reveal>
          <Eyebrow>Effortless Integration</Eyebrow>
          <Heading>
            Connect to <span className="text-brand-gradient">Any Backend</span>
          </Heading>
          <Lead>
            Chelone is designed to fit seamlessly with the tools you already
            know and love. As a single-page app, it connects to any
            backend—REST, GraphQL, or custom APIs—and works with any
            authentication provider.
          </Lead>

          <RevealItem className="mt-8 flex flex-wrap items-center gap-3">
            {backendLogos.map((logo) => (
              <LogoChip key={logo.label} label={logo.label} src={logo.src} />
            ))}
            <span className="inline-flex items-center rounded-full border border-dashed border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground">
              Works with any REST or GraphQL API
            </span>
          </RevealItem>

          <RevealItem className="mt-9">
            <CtaButton to={links.dataProviders}>Learn More</CtaButton>
          </RevealItem>
        </Reveal>

        {/* Data-flow diagram */}
        <Reveal delay={0.1}>
          <BezelPanel>
            <div
              className={cn("flex flex-col items-center gap-3 p-6", insetCard)}
            >
              <FlowBox label="Your App" icon={LayoutDashboard} />
              <MonoPill>useGetList(&apos;posts&apos;)</MonoPill>
              <ArrowDown
                className="size-4 text-muted-foreground"
                strokeWidth={1.75}
              />
              <FlowBox label="dataProvider" icon={Database} brand />
              <MonoPill>REST · GraphQL · any API</MonoPill>
              <ArrowDown
                className="size-4 text-muted-foreground"
                strokeWidth={1.75}
              />
              <FlowBox label="Your Backend" icon={Database} />
            </div>
          </BezelPanel>
        </Reveal>
      </div>
    </Section>
  );
}
