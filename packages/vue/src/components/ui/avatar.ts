/**
 * The avatar family (`Avatar` / `AvatarImage` / `AvatarFallback`) — the Vue
 * analog of shadcn's radix-backed `Avatar`. Dependency-free: `Avatar` is a
 * rounded, `overflow-hidden` container; `AvatarFallback` always renders behind
 * it (initials / placeholder); `AvatarImage` covers the fallback when it has a
 * `src` and loads, and removes itself on error (a local `failed` ref mirroring
 * radix's load-status gate). `Avatar` takes an optional `size`, and
 * `AvatarGroup` / `AvatarGroupCount` stack avatars with a `+N` overflow. The
 * whole family lives in one module (like `sidebar-parts.ts`) rather than
 * near-empty SFCs.
 */

import { defineComponent, type FunctionalComponent, h, ref } from "vue";
import { cn } from "../../lib/utils";

interface ClassProps {
  class?: string;
}

interface AvatarProps extends ClassProps {
  size?: "default" | "sm" | "lg";
}

const AVATAR_SIZE_CLASS = {
  default: "size-8",
  sm: "size-6",
  lg: "size-10",
} as const;

/**
 * The rounded container. Stacks `AvatarImage` over `AvatarFallback`. Without
 * `size` it renders as before; with one it sets `data-size` and the size class.
 */
export const Avatar: FunctionalComponent<AvatarProps> = (props, { slots }) =>
  h(
    "span",
    {
      "data-slot": "avatar",
      ...(props.size ? { "data-size": props.size } : {}),
      class: cn(
        // `cn` does not merge conflicts, so a size replaces the default class.
        props.size && "group/avatar",
        "relative flex",
        AVATAR_SIZE_CLASS[props.size ?? "default"],
        "shrink-0 overflow-hidden rounded-full",
        props.class,
      ),
    },
    slots.default?.(),
  );
Avatar.props = ["class", "size"];
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
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        props.class,
      ),
    },
    slots.default?.(),
  );
AvatarFallback.props = ["class"];
AvatarFallback.displayName = "AvatarFallback";

/** Stacks avatars with an overlap and a ring that separates them. */
export const AvatarGroup: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  h(
    "div",
    {
      "data-slot": "avatar-group",
      class: cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        props.class,
      ),
    },
    slots.default?.(),
  );
AvatarGroup.props = ["class"];
AvatarGroup.displayName = "AvatarGroup";

/** The `+N` chip that closes an `AvatarGroup`; it matches the size of the avatars beside it. */
export const AvatarGroupCount: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  h(
    "div",
    {
      "data-slot": "avatar-group-count",
      class: cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        props.class,
      ),
    },
    slots.default?.(),
  );
AvatarGroupCount.props = ["class"];
AvatarGroupCount.displayName = "AvatarGroupCount";
