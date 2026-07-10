/**
 * The shadcn `Badge`, the Vue analog of `@chelone/react`'s `ui/badge.tsx`. A
 * pure structural `defineComponent` render component (mirrors the `card.ts` /
 * `table.ts` style in this `ui/` slice). Renders a `<span>` with the variant's
 * class map; `chip-field` / `badge-field` compose it. The React twin builds its
 * classes with `cva`; here the (small, fixed) variant set is a literal map — no
 * runtime cva dep — with the same visual contract.
 */

import { defineComponent, h } from "vue";
import { cn } from "../../lib/utils";

/** The badge visual variants (parity with the React `badgeVariants` set). */
export type BadgeVariant = "default" | "outline" | "secondary" | "destructive";

const BADGE_BASE =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-white",
  outline: "border-border text-foreground",
};

export const Badge = defineComponent({
  name: "Badge",
  props: {
    variant: { type: String as () => BadgeVariant, default: "default" },
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "span",
        {
          "data-slot": "badge",
          "data-variant": props.variant,
          class: cn(BADGE_BASE, BADGE_VARIANTS[props.variant], props.class),
        },
        slots.default?.(),
      );
  },
});
