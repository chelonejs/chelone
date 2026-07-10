/**
 * The shadcn `Card` family, the Vue analog of `@chelone/react`'s `ui/card.tsx`.
 * Pure structural wrappers as `defineComponent` render components. The V1 slice
 * uses `Card` as the optional container shell for Edit/Create form bodies.
 */

import { defineComponent, h } from "vue";
import { cn } from "../../lib/utils";

function part(name: string, baseClass: string, tag = "div") {
  return defineComponent({
    name,
    props: { class: { type: String, default: "" } },
    setup(props, { slots }) {
      return () =>
        h(
          tag,
          {
            "data-slot": name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
            class: cn(baseClass, props.class),
          },
          slots.default?.(),
        );
    },
  });
}

export const Card = part(
  "Card",
  "rounded-xl border bg-card text-card-foreground shadow",
);
export const CardHeader = part("CardHeader", "flex flex-col gap-1.5 p-6");
export const CardTitle = part("CardTitle", "font-semibold leading-none", "h3");
export const CardContent = part("CardContent", "p-6 pt-0");
export const CardFooter = part("CardFooter", "flex items-center p-6 pt-0");
