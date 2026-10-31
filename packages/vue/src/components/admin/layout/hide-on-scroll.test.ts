/**
 * `<HideOnScroll>` — hides its slot on a downward scroll past `threshold` and
 * shows it on any upward scroll. State is read from `data-state`.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import HideOnScroll from "./hide-on-scroll.vue";

let wrapper: VueWrapper | undefined;

function mountBar(props: { threshold?: number } = {}) {
  wrapper = mount(HideOnScroll, {
    props,
    attrs: { "data-testid": "wrapper" },
    slots: { default: () => h("header", "Bar") },
  });
  return wrapper;
}

async function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  window.dispatchEvent(new Event("scroll"));
  await wrapper?.vm.$nextTick();
}

function state() {
  return wrapper?.get("[data-testid=wrapper]").attributes("data-state");
}

beforeEach(() => {
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
});

describe("<HideOnScroll>", () => {
  it("starts visible", () => {
    mountBar();
    expect(state()).toBe("visible");
    expect(wrapper?.text()).toContain("Bar");
  });

  it("hides when scrolling down past the threshold", async () => {
    mountBar();
    await scrollTo(101);
    expect(state()).toBe("hidden");
  });

  it("stays visible when scrolling down within the threshold", async () => {
    mountBar();
    await scrollTo(100);
    expect(state()).toBe("visible");
  });

  it("shows again when scrolling up", async () => {
    mountBar();
    await scrollTo(300);
    expect(state()).toBe("hidden");
    await scrollTo(299);
    expect(state()).toBe("visible");
  });

  it("removes its scroll listener on unmount", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    mountBar();
    const added = add.mock.calls.find(([type]) => type === "scroll");
    expect(added?.[2]).toEqual({ passive: true });

    wrapper?.unmount();
    const removed = remove.mock.calls.find(([type]) => type === "scroll");
    expect(removed?.[1]).toBe(added?.[1]);
  });

  it("follows a changed threshold", async () => {
    mountBar({ threshold: 100 });
    await wrapper?.setProps({ threshold: 200 });
    await scrollTo(150);
    expect(state()).toBe("visible");
    await scrollTo(250);
    expect(state()).toBe("hidden");
  });
});
