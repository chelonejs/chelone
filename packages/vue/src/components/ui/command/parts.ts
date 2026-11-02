/**
 * The structural command parts — thin containers over the command context, the
 * Vue analog of shadcn's same-named parts. Functional components so the set
 * lives in one dependency-free module; the stateful parts stay as SFCs.
 */

import { type FunctionalComponent, h } from "vue";
import { cn } from "../../../lib/utils";
import { useCommand } from "./context";

interface ClassProps {
  class?: string;
}

/** The scrollable `role="listbox"` that holds the items. */
export const CommandList: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  h(
    "div",
    {
      id: useCommand().listId,
      role: "listbox",
      "data-slot": "command-list",
      class: cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto",
        props.class,
      ),
    },
    slots.default?.(),
  );
CommandList.props = ["class"];
CommandList.displayName = "CommandList";

/** Shown only while no item shows. */
export const CommandEmpty: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  useCommand().visibleCount.value === 0
    ? h(
        "div",
        {
          role: "presentation",
          "data-slot": "command-empty",
          class: cn("py-6 text-center text-sm", props.class),
        },
        slots.default?.(),
      )
    : null;
CommandEmpty.props = ["class"];
CommandEmpty.displayName = "CommandEmpty";

/** A horizontal divider between groups. */
export const CommandSeparator: FunctionalComponent<ClassProps> = (props) =>
  h("div", {
    role: "separator",
    "data-slot": "command-separator",
    class: cn("-mx-1 h-px bg-border", props.class),
  });
CommandSeparator.props = ["class"];
CommandSeparator.displayName = "CommandSeparator";

/** A right-aligned keyboard hint inside an item. */
export const CommandShortcut: FunctionalComponent<ClassProps> = (
  props,
  { slots },
) =>
  h(
    "span",
    {
      "data-slot": "command-shortcut",
      class: cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        props.class,
      ),
    },
    slots.default?.(),
  );
CommandShortcut.props = ["class"];
CommandShortcut.displayName = "CommandShortcut";
