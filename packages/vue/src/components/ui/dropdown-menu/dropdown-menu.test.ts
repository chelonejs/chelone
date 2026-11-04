/**
 * The dependency-free `dropdown-menu` family, mounted the way a consumer
 * composes it. `<DropdownMenuItem>` is a `div` with `role="menuitem"` and
 * `tabindex="0"`, which the browser gives no key activation, so the item owns
 * Enter and Space itself. Keys are dispatched by hand because `trigger` returns
 * nothing to read `defaultPrevented` off.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./index";

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

/** Mount the family open, recording every `select` the items emit. */
async function openMenu(
  labels: string[],
  selected: string[] = [],
): Promise<VueWrapper> {
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(DropdownMenu, {}, () => [
          h(DropdownMenuTrigger, {}, () =>
            h("button", { type: "button" }, "Open"),
          ),
          h(DropdownMenuContent, {}, () =>
            labels.map((label) =>
              h(
                DropdownMenuItem,
                {
                  key: label,
                  onSelect: () => {
                    selected.push(label);
                  },
                },
                () => label,
              ),
            ),
          ),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  // The trigger listens for the click bubbling out of its child button.
  (wrapper.get("button").element as HTMLElement).click();
  await nextTick();
  return wrapper;
}

const items = (wrapper: VueWrapper) => wrapper.findAll('[role="menuitem"]');
/** `findAll` hands back a `DOMWrapper<Element>`; the tests want an element. */
const el = (node: { element: unknown }) => node.element as HTMLElement;

/** Focus an item and press `key` on it, as a keyboard user does. */
async function press(target: HTMLElement, key: string): Promise<Event> {
  target.focus();
  const event = new Event("keydown", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "key", { value: key });
  target.dispatchEvent(event);
  await nextTick();
  return event;
}

describe("<DropdownMenuItem>", () => {
  it("a click selects and closes the menu", async () => {
    const selected: string[] = [];
    const wrapper = await openMenu(["One", "Two"], selected);

    el(items(wrapper)[0]!).click();
    await nextTick();

    expect(selected).toEqual(["One"]);
    expect(items(wrapper)).toHaveLength(0);
  });

  it("Enter on a focused item selects and closes the menu", async () => {
    const selected: string[] = [];
    const wrapper = await openMenu(["One", "Two"], selected);

    await press(el(items(wrapper)[1]!), "Enter");

    expect(selected).toEqual(["Two"]);
    expect(items(wrapper)).toHaveLength(0);
  });

  it("Space selects and is prevented so the page does not scroll", async () => {
    const selected: string[] = [];
    const wrapper = await openMenu(["One", "Two"], selected);

    const space = await press(el(items(wrapper)[0]!), " ");

    expect(space.defaultPrevented).toBe(true);
    expect(selected).toEqual(["One"]);
    expect(items(wrapper)).toHaveLength(0);
  });

  it("another key leaves the menu open and selects nothing", async () => {
    const selected: string[] = [];
    const wrapper = await openMenu(["One", "Two"], selected);

    await press(el(items(wrapper)[0]!), "x");

    expect(selected).toEqual([]);
    expect(items(wrapper)).toHaveLength(2);
  });

  it("every item is a focusable menuitem", async () => {
    const wrapper = await openMenu(["One", "Two"]);

    expect(items(wrapper).map((item) => item.attributes("tabindex"))).toEqual([
      "0",
      "0",
    ]);
  });
});
