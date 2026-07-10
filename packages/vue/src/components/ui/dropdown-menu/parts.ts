/**
 * The structural dropdown-menu parts (`DropdownMenuLabel` / `DropdownMenuSeparator`)
 * — thin styled containers with no behavior, the Vue analog of shadcn's
 * same-named parts. Functional components (like `sidebar-parts.ts`) so the pair
 * lives in one dependency-free module. The interactive parts (`DropdownMenu`,
 * `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`) stay as SFCs.
 */

import { type FunctionalComponent, h } from "vue";
import { cn } from "../../../lib/utils";

interface ClassProps {
  class?: string;
}

/** A non-interactive section heading inside the menu. */
export const DropdownMenuLabel: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  h(
    "div",
    {
      "data-slot": "dropdown-menu-label",
      class: cn("px-2 py-1.5 text-sm font-semibold", props.class),
    },
    slots.default?.(),
  );
DropdownMenuLabel.props = ["class"];
DropdownMenuLabel.displayName = "DropdownMenuLabel";

/** A horizontal divider between menu groups. */
export const DropdownMenuSeparator: FunctionalComponent<ClassProps> = (props) =>
  h("div", {
    "data-slot": "dropdown-menu-separator",
    role: "separator",
    class: cn("-mx-1 my-1 h-px bg-muted", props.class),
  });
DropdownMenuSeparator.props = ["class"];
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
