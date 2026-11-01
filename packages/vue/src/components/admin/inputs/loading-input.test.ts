/**
 * `<CardContentInner>` and `<LoadingInput>` tests: the stacked card section and
 * the placeholder input that holds a place while data loads.
 */

import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import CardContentInner from "../view/card-content-inner.vue";
import LoadingInput from "./loading-input.vue";

enableAutoUnmount(afterEach);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CardContentInner", () => {
  it("CardContentInner renders its slot and passes class through", () => {
    const wrapper = mount(CardContentInner, {
      props: { class: "custom-class" },
      slots: { default: () => h("p", "First section") },
    });

    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.text()).toBe("First section");
    expect(wrapper.classes()).toContain("custom-class");
  });
});

describe("LoadingInput", () => {
  it("LoadingInput renders a disabled, busy, read-only input with its label tied to it", () => {
    const wrapper = mount(LoadingInput, { props: { label: "Title" } });

    const input = wrapper.get("input").element;
    const label = wrapper.get("label").element;
    expect(label.textContent).toBe("Title");
    expect(input.id).not.toBe("");
    expect(label.getAttribute("for")).toBe(input.id);
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe("");
    expect(input.getAttribute("aria-busy")).toBe("true");
    expect(wrapper.element.tagName).toBe("FIELDSET");
    expect(wrapper.attributes("data-slot")).toBe("loading-input");
  });

  it("LoadingInput shows no spinner before the timeout and one after it", async () => {
    const wrapper = mount(LoadingInput, { props: { label: "Title" } });

    await vi.advanceTimersByTimeAsync(999);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("LoadingInput timeout prop changes when the spinner appears", async () => {
    const wrapper = mount(LoadingInput, {
      props: { label: "Title", timeout: 200 },
    });

    await vi.advanceTimersByTimeAsync(199);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("LoadingInput renders the helper text and omits the label when none is given", () => {
    const wrapper = mount(LoadingInput, {
      props: { helperText: "Loading the title" },
    });

    expect(wrapper.text()).toContain("Loading the title");
    expect(wrapper.find("label").exists()).toBe(false);
    expect(wrapper.find("fieldset").exists()).toBe(true);
  });
});
