/**
 * The dependency-free `command` family, mounted the way a consumer composes it:
 * a `<Command>` with an input, a list and items, driven by typing, keys and
 * pointer events. jsdom applies no CSS, so visibility is read from the inline
 * `display: none` the family sets, never from styling classes.
 */

import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./index";

interface ItemSpec {
  value: string;
  keywords?: string[];
  disabled?: boolean;
  forceMount?: boolean;
}

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const w of wrappers.splice(0)) w.unmount();
});

const FRUIT: ItemSpec[] = [
  { value: "Apple", keywords: ["red", "pome"] },
  { value: "Banana", keywords: ["yellow"] },
  { value: "Cherry", keywords: ["red", "stone"] },
];

function items(specs: ItemSpec[], onSelect?: (value: string) => void) {
  return specs.map((spec) =>
    h(
      CommandItem,
      { key: spec.value, ...spec, onSelect: () => onSelect?.(spec.value) },
      () => spec.value,
    ),
  );
}

function palette(
  specs: ItemSpec[] = FRUIT,
  rootProps: Record<string, unknown> = {},
  onSelect?: (value: string) => void,
) {
  const w = mount(
    defineComponent({
      render: () =>
        h(Command, rootProps, () => [
          h(CommandInput, { placeholder: "Search" }),
          h(CommandList, null, () => [
            h(CommandEmpty, null, () => "No results"),
            ...items(specs, onSelect),
          ]),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(w);
  return w;
}

function shown(w: VueWrapper): string[] {
  return w
    .findAll('[role="option"]')
    .filter((o) => o.isVisible())
    .map((o) => o.text());
}

function activeText(w: VueWrapper): string | undefined {
  return w
    .findAll('[role="option"]')
    .find((o) => o.isVisible() && o.attributes("data-selected") === "true")
    ?.text();
}

async function search(w: VueWrapper, text: string): Promise<void> {
  await w.find("input").setValue(text);
  await nextTick();
}

async function key(w: VueWrapper, name: string): Promise<void> {
  await w.find("input").trigger("keydown", { key: name });
  await nextTick();
}

describe("Command filtering", () => {
  it("Command shows every item with an empty search", async () => {
    const w = palette();
    await nextTick();
    expect(shown(w)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("Command hides items that do not match the search, by value and by keyword", async () => {
    const w = palette();
    await nextTick();
    await search(w, "ban");
    expect(shown(w)).toEqual(["Banana"]);
    await search(w, "red");
    expect(shown(w)).toEqual(["Apple", "Cherry"]);
    await search(w, "zzz");
    expect(shown(w)).toEqual([]);
  });

  it("Command matches case-insensitively", async () => {
    const w = palette();
    await nextTick();
    await search(w, "CHERRY");
    expect(shown(w)).toEqual(["Cherry"]);
    await search(w, "YeLLoW");
    expect(shown(w)).toEqual(["Banana"]);
  });

  it("Command shows a forceMount item whatever the search is", async () => {
    const w = palette([...FRUIT, { value: "Always here", forceMount: true }]);
    await nextTick();
    await search(w, "ban");
    expect(shown(w)).toEqual(["Banana", "Always here"]);
  });

  it("Command shows everything when shouldFilter is false", async () => {
    const w = palette(FRUIT, { shouldFilter: false });
    await nextTick();
    await search(w, "zzz");
    expect(shown(w)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("Command uses a custom filter function", async () => {
    const filter = vi.fn(
      (value: string, _search: string, keywords?: string[]) =>
        value === "Cherry" && keywords?.includes("stone") ? 1 : 0,
    );
    const w = palette(FRUIT, { filter });
    await nextTick();
    await search(w, "anything");
    expect(shown(w)).toEqual(["Cherry"]);
    expect(filter).toHaveBeenCalledWith("Cherry", "anything", ["red", "stone"]);
  });

  it("Command emits update:modelValue with the search text", async () => {
    const updates: string[] = [];
    const w = palette(FRUIT, {
      modelValue: "",
      "onUpdate:modelValue": (v: string) => updates.push(v),
    });
    await nextTick();
    await search(w, "app");
    expect(updates).toEqual(["app"]);
  });
});

describe("CommandGroup and CommandEmpty", () => {
  function grouped() {
    const w = mount(
      defineComponent({
        render: () =>
          h(Command, null, () => [
            h(CommandInput),
            h(CommandList, null, () => [
              h(CommandEmpty, null, () => "No results"),
              h(CommandGroup, { heading: "Fruit" }, () => [
                h(CommandItem, { value: "Apple" }, () => "Apple"),
              ]),
              h(CommandSeparator),
              h(CommandGroup, { heading: "Veg" }, () => [
                h(CommandItem, { value: "Carrot" }, () => "Carrot"),
                h(CommandItem, { value: "Leek" }, () => [
                  "Leek",
                  h(CommandShortcut, null, () => "L"),
                ]),
              ]),
            ]),
          ]),
      }),
      { attachTo: document.body },
    );
    wrappers.push(w);
    return w;
  }

  it("CommandGroup hides itself and its heading when none of its items matches", async () => {
    const w = grouped();
    await nextTick();
    const groups = () =>
      w
        .findAll('[role="group"]')
        .filter((g) => g.isVisible())
        .map((g) => g.attributes("aria-labelledby"))
        .map((id) => document.getElementById(id ?? "")?.textContent);
    expect(groups()).toEqual(["Fruit", "Veg"]);
    await search(w, "carr");
    expect(groups()).toEqual(["Veg"]);
    await search(w, "zzz");
    expect(groups()).toEqual([]);
  });

  it("CommandEmpty and CommandGroup show the right state on the first render, before items register", async () => {
    const w = palette();
    expect(w.text()).not.toContain("No results");
    const g = mount(
      defineComponent({
        render: () =>
          h(Command, null, () => [
            h(CommandGroup, { heading: "Fruit" }, () => [
              h(CommandItem, { value: "Apple" }, () => "Apple"),
            ]),
          ]),
      }),
    );
    wrappers.push(g);
    expect(g.find('[role="group"]').isVisible()).toBe(true);
    const none = palette([]);
    await nextTick();
    expect(none.text()).toContain("No results");
  });

  it("CommandEmpty shows only when no item matches", async () => {
    const w = palette();
    await nextTick();
    expect(w.text()).not.toContain("No results");
    await search(w, "zzz");
    expect(w.text()).toContain("No results");
    await search(w, "app");
    expect(w.text()).not.toContain("No results");
  });
});

describe("Command keyboard and pointer", () => {
  it("ArrowDown and ArrowUp move the active item and wrap at the ends", async () => {
    const w = palette();
    await nextTick();
    expect(activeText(w)).toBe("Apple");
    await key(w, "ArrowDown");
    expect(activeText(w)).toBe("Banana");
    await key(w, "ArrowDown");
    await key(w, "ArrowDown");
    expect(activeText(w)).toBe("Apple");
    await key(w, "ArrowUp");
    expect(activeText(w)).toBe("Cherry");
  });

  it("Home and End jump to the first and last visible item", async () => {
    const w = palette();
    await nextTick();
    await search(w, "red");
    await key(w, "End");
    expect(activeText(w)).toBe("Cherry");
    await key(w, "Home");
    expect(activeText(w)).toBe("Apple");
  });

  it("Enter emits select on the active item and skips a disabled one", async () => {
    const selected: string[] = [];
    const w = palette(
      [
        { value: "Apple", disabled: true },
        { value: "Banana" },
        { value: "Cherry" },
      ],
      {},
      (v) => selected.push(v),
    );
    await nextTick();
    expect(activeText(w)).toBe("Banana");
    await key(w, "Enter");
    expect(selected).toEqual(["Banana"]);
    await key(w, "ArrowUp");
    expect(activeText(w)).toBe("Cherry");
    await w.findAll('[role="option"]')[0]?.trigger("click");
    expect(selected).toEqual(["Banana"]);
  });

  it("the first visible item becomes active when the search changes", async () => {
    const w = palette();
    await nextTick();
    await key(w, "ArrowDown");
    expect(activeText(w)).toBe("Banana");
    await search(w, "red");
    expect(activeText(w)).toBe("Apple");
    await search(w, "ch");
    expect(activeText(w)).toBe("Cherry");
  });

  it("the default active item follows a reorder of the items", async () => {
    const order = ref(["Apple", "Banana", "Cherry"]);
    const w = mount(
      defineComponent({
        render: () =>
          h(Command, null, () => [
            h(CommandInput),
            h(CommandList, null, () =>
              order.value.map((value) =>
                h(CommandItem, { key: value, value }, () => value),
              ),
            ),
          ]),
      }),
      { attachTo: document.body },
    );
    wrappers.push(w);
    await nextTick();
    expect(activeText(w)).toBe("Apple");
    order.value = ["Cherry", "Apple", "Banana"];
    await flushPromises();
    expect(activeText(w)).toBe("Cherry");
    expect(w.find("input").attributes("aria-activedescendant")).toBe(
      w.findAll('[role="option"]')[0]?.attributes("id"),
    );
  });

  it("hovering an item makes it active", async () => {
    const w = palette([
      { value: "Apple" },
      { value: "Banana" },
      { value: "Cherry", disabled: true },
    ]);
    await nextTick();
    const options = w.findAll('[role="option"]');
    await options[1]?.trigger("pointermove");
    expect(activeText(w)).toBe("Banana");
    await options[2]?.trigger("pointermove");
    expect(activeText(w)).toBe("Banana");
  });

  it("the input, list and items carry combobox, listbox and option roles with aria-activedescendant", async () => {
    const w = palette();
    await nextTick();
    const input = w.find("input");
    const list = w.find('[role="listbox"]');
    const options = w.findAll('[role="option"]');
    expect(input.attributes("role")).toBe("combobox");
    expect(input.attributes("aria-expanded")).toBe("true");
    expect(input.attributes("aria-controls")).toBe(list.attributes("id"));
    expect(input.attributes("aria-activedescendant")).toBe(
      options[0]?.attributes("id"),
    );
    expect(options[0]?.attributes("aria-selected")).toBe("true");
    expect(options[1]?.attributes("aria-selected")).toBe("false");
    await key(w, "ArrowDown");
    expect(input.attributes("aria-activedescendant")).toBe(
      options[1]?.attributes("id"),
    );
    await search(w, "zzz");
    expect(input.attributes("aria-activedescendant")).toBeUndefined();
  });
});

describe("CommandDialog", () => {
  function dialog(initial: boolean) {
    const open = ref(initial);
    const w = mount(
      defineComponent({
        render: () =>
          h(
            CommandDialog,
            {
              open: open.value,
              title: "Palette",
              description: "Pick a command",
              "onUpdate:open": (v: boolean) => {
                open.value = v;
              },
            },
            () => [
              h(CommandInput),
              h(CommandList, null, () => [
                h(CommandItem, { value: "Apple" }, () => "Apple"),
              ]),
            ],
          ),
      }),
      { attachTo: document.body },
    );
    wrappers.push(w);
    return { w, open };
  }

  it("CommandDialog renders a dialog when open, focuses the input and closes on Escape and on the backdrop", async () => {
    const { w, open } = dialog(true);
    await nextTick();
    await nextTick();
    const panel = w.find('[role="dialog"]');
    expect(panel.exists()).toBe(true);
    expect(
      document.getElementById(panel.attributes("aria-labelledby") ?? ""),
    ).toHaveProperty("textContent", "Palette");
    expect(
      document.getElementById(panel.attributes("aria-describedby") ?? ""),
    ).toHaveProperty("textContent", "Pick a command");
    expect(document.activeElement).toBe(w.find("input").element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(open.value).toBe(false);
    expect(w.find('[role="dialog"]').exists()).toBe(false);

    open.value = true;
    await nextTick();
    await w.find('[data-slot="command-dialog-overlay"]').trigger("click");
    expect(open.value).toBe(false);
  });

  it("CommandDialog renders nothing when closed", async () => {
    const { w } = dialog(false);
    await nextTick();
    expect(w.find('[role="dialog"]').exists()).toBe(false);
    expect(w.find("input").exists()).toBe(false);
  });
});
