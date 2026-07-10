/**
 * The avatar family (`Avatar` / `AvatarImage` / `AvatarFallback`) — the Vue
 * analog of shadcn's radix-backed `Avatar`. Dependency-free: `Avatar` is a
 * rounded, `overflow-hidden` container; `AvatarFallback` always renders behind
 * it (initials / placeholder); `AvatarImage` covers the fallback when it has a
 * `src` and loads, and removes itself on error (a local `failed` ref mirroring
 * radix's load-status gate). The whole family lives in one module (like
 * `sidebar-parts.ts`) rather than three near-empty SFCs.
 */

import { defineComponent, type FunctionalComponent, h, ref } from "vue";
import { cn } from "../../lib/utils";

interface ClassProps {
  class?: string;
}

/** The rounded container. Stacks `AvatarImage` over `AvatarFallback`. */
export const Avatar: FunctionalComponent<ClassProps> = (props, { slots }) =>
  h(
    "span",
    {
      "data-slot": "avatar",
      class: cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        props.class,
      ),
    },
    slots.default?.(),
  );
Avatar.props = ["class"];
Avatar.displayName = "Avatar";

/**
 * The avatar image. Renders nothing when it has no `src` or the load fails (so
 * the fallback shows through), mirroring radix's load-status gate.
 */
export const AvatarImage = defineComponent({
  name: "AvatarImage",
  props: {
    src: { type: String, default: undefined },
    alt: { type: String, default: undefined },
    class: { type: String, default: undefined },
  },
  setup(props) {
    const failed = ref(false);
    return () =>
      !props.src || failed.value
        ? null
        : h("img", {
            src: props.src,
            alt: props.alt,
            "data-slot": "avatar-image",
            class: cn("aspect-square size-full object-cover", props.class),
            onError: () => {
              failed.value = true;
            },
          });
  },
});

/** The fallback shown when no image is present (typically the name's initial). */
export const AvatarFallback: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  h(
    "span",
    {
      "data-slot": "avatar-fallback",
      class: cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm",
        props.class,
      ),
    },
    slots.default?.(),
  );
AvatarFallback.props = ["class"];
AvatarFallback.displayName = "AvatarFallback";
