import {
  BicepsFlexed,
  GraduationCap,
  LayoutPanelLeft,
  LockOpen,
  type LucideIcon,
  Plug,
  Sparkles,
} from "lucide-react";

export interface WhyReason {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const whyReasons: WhyReason[] = [
  {
    title: "Get a head start",
    description:
      "Kickstart your project with pre-built components — no need to reinvent the wheel.",
    icon: LayoutPanelLeft,
  },
  {
    title: "Schema-driven",
    description:
      "Point a resource at a Zod schema and get typed records plus zero-boilerplate form validation, out of the box.",
    icon: GraduationCap,
  },
  {
    title: "Headless core",
    description:
      "Built on @chelone/core — a framework-agnostic engine of hooks and controllers that pairs with any UI. React and Vue adapters ship.",
    icon: Plug,
  },
  {
    title: "No lock-in",
    description:
      "The code is open-source. Host it anywhere with zero hidden costs.",
    icon: LockOpen,
  },
  {
    title: "Industry best practices",
    description:
      "Responsive design, accessibility, and performance are built-in.",
    icon: BicepsFlexed,
  },
  {
    title: "Standard Schema",
    description:
      "Validation runs on the Standard Schema seam, so Zod plugs straight in — and other validators can too.",
    icon: Sparkles,
  },
];
