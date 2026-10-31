/**
 * `<Placeholder>` — a muted span that holds a field's height while it loads.
 * Mounted directly: it reads no admin context.
 */

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import Placeholder from "./placeholder.vue";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

function mountPlaceholder(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) {
  const wrapper = mount(Placeholder, { props, slots });
  mounted.push(wrapper);
  return wrapper;
}

describe("<Placeholder>", () => {
  it("renders a non-breaking space by default", () => {
    const wrapper = mountPlaceholder();
    expect(wrapper.text()).toBe("");
    expect(wrapper.element.textContent).toBe(" ");
  });

  it("renders its default slot instead", () => {
    const wrapper = mountPlaceholder({}, { default: "Loading name" });
    expect(wrapper.element.textContent).toBe("Loading name");
  });

  it("merges class", () => {
    const wrapper = mountPlaceholder({ class: "w-24" });
    expect(wrapper.element.tagName).toBe("SPAN");
    expect(wrapper.element.classList.contains("w-24")).toBe(true);
    expect(wrapper.element.classList.contains("bg-muted")).toBe(true);
    expect(wrapper.element.classList.contains("inline-flex")).toBe(true);
  });
});
