/**
 * The shadcn `Alert` family, the Vue analog of `@chelone/react`'s
 * `ui/alert.tsx`. Pure structural `defineComponent` render components in the
 * style of `badge.ts`. Only the parts the realtime components use are ported:
 * `Alert` and `AlertDescription`.
 */

import { defineComponent, h } from "vue";
import { cn } from "../../lib/utils";

/** The alert visual variants (parity with the React `alertVariants` set). */
export type AlertVariant = "default" | "destructive";

const ALERT_BASE =
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current";

const ALERT_VARIANTS: Record<AlertVariant, string> = {
  default: "bg-card text-card-foreground",
  destructive:
    "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
};

export const Alert = defineComponent({
  name: "Alert",
  props: {
    variant: { type: String as () => AlertVariant, default: "default" },
    class: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "data-slot": "alert",
          role: "alert",
          class: cn(ALERT_BASE, ALERT_VARIANTS[props.variant], props.class),
        },
        slots.default?.(),
      );
  },
});

export const AlertDescription = defineComponent({
  name: "AlertDescription",
  props: { class: { type: String, default: "" } },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "data-slot": "alert-description",
          class: cn(
            "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
            props.class,
          ),
        },
        slots.default?.(),
      );
  },
});
