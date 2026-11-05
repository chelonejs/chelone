/**
 * `<CommandInput>` key handling, mounted inside a `<Command>` the way a
 * consumer composes it. The active item is read from `aria-selected`.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { Command, CommandInput, CommandItem, CommandList } from "./index";

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const w of wrappers.splice(0)) w.unmount();
});

async function palette(): Promise<VueWrapper> {
  const w = mount(
    defineComponent({
      render: () =>
        h(Command, null, () => [
          h(CommandInput),
          h(CommandList, null, () =>
            ["Apple", "Banana", "Cherry"].map((value) =>
              h(CommandItem, { key: value, value }, () => value),
            ),
          ),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(w);
  await nextTick();
  return w;
}

function activeText(w: VueWrapper): string | undefined {
  return w
    .findAll('[role="option"]')
    .find((o) => o.attributes("aria-selected") === "true")
    ?.text();
}

async function press(w: VueWrapper, key: string): Promise<KeyboardEvent> {
  const event = new KeyboardEvent("keydown", { key, cancelable: true });
  w.find("input").element.dispatchEvent(event);
  await nextTick();
  return event;
}

describe("CommandInput keys", () => {
  it("ArrowDown moves to the next item", async () => {
    const w = await palette();
    expect(activeText(w)).toBe("Apple");
    const event = await press(w, "ArrowDown");
    expect(activeText(w)).toBe("Banana");
    expect(event.defaultPrevented).toBe(true);
  });

  it("Home moves to the first item", async () => {
    const w = await palette();
    await press(w, "End");
    expect(activeText(w)).toBe("Cherry");
    await press(w, "Home");
    expect(activeText(w)).toBe("Apple");
  });

  it("an inherited key such as toString does nothing", async () => {
    const w = await palette();
    await press(w, "ArrowDown");
    const event = await press(w, "toString");
    expect(activeText(w)).toBe("Banana");
    expect(event.defaultPrevented).toBe(false);
  });
});
