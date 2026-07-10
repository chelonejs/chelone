/**
 * The shadcn `Table` family, the Vue analog of `@chelone/react`'s `ui/table.tsx`
 * (`Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` /
 * `TableCell`). Pure structural wrappers over the native table elements, kept as
 * `defineComponent` render components in one dependency-free module.
 */

import { defineComponent, h } from "vue";
import { cn } from "../../lib/utils";

function wrapper(name: string, tag: string, baseClass: string) {
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

/** The `<table>` in a scrollable rounded container. */
export const Table = defineComponent({
  name: "Table",
  props: { class: { type: String, default: "" } },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "data-slot": "table-container",
          class: "relative w-full overflow-x-auto",
        },
        [
          h(
            "table",
            {
              "data-slot": "table",
              class: cn("w-full caption-bottom text-sm", props.class),
            },
            slots.default?.(),
          ),
        ],
      );
  },
});

export const TableHeader = wrapper("TableHeader", "thead", "[&_tr]:border-b");
export const TableBody = wrapper(
  "TableBody",
  "tbody",
  "[&_tr:last-child]:border-0",
);
export const TableRow = wrapper(
  "TableRow",
  "tr",
  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
);
export const TableHead = wrapper(
  "TableHead",
  "th",
  "h-10 px-2 text-left align-middle font-medium text-muted-foreground",
);
export const TableCell = wrapper(
  "TableCell",
  "td",
  "p-2 align-middle whitespace-nowrap",
);
