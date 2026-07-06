import type { MetaFunction } from "react-router";
import { Advanced } from "@/landing/advanced";
import { Backends } from "@/landing/backends";
import { CodeShowcase } from "@/landing/code-showcase";
import { Deploy } from "@/landing/deploy";
import { Features } from "@/landing/features";
import { FinalCta } from "@/landing/final-cta";
import { Hero } from "@/landing/hero";
import { LandingBackdrop } from "@/landing/landing-backdrop";
import { LandingFooter } from "@/landing/landing-footer";
import { OpenSource } from "@/landing/open-source";
import { SectionDivider } from "@/landing/section";
import { TechLogos } from "@/landing/tech-logos";
import { Why } from "@/landing/why";

export const meta: MetaFunction = () => [
  { title: "Chelone — Zod-first admin engine for React" },
  {
    name: "description",
    content:
      "Point at a Zod schema, ship an admin panel. A framework-agnostic admin engine for React, composed with production-ready shadcn blocks.",
  },
];

/** Marketing landing page — composes the landing sections top to bottom. */
export default function Home() {
  return (
    <main>
      <LandingBackdrop />
      <Hero />
      <SectionDivider />
      <TechLogos />
      <SectionDivider />
      <Features />
      <SectionDivider />
      <Advanced />
      <SectionDivider />
      <Backends />
      <SectionDivider />
      <Deploy />
      <SectionDivider />
      <OpenSource />
      <SectionDivider />
      <Why />
      <SectionDivider />
      <CodeShowcase />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
