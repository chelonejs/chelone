/**
 * `<SkipNavigationButton>` — the off-screen "skip to content" button. Mounted as
 * the `#layout` of a real `<Admin>` with a real i18n instance; asserts the label,
 * the focus hand-off to `#main-content`, and the missing-target warning.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import SkipNavigationButton from "./skip-navigation-button.vue";

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

function mountLayout(
  content: () => VNodeChild,
  messages: Record<string, string> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      i18n: createI18n({
        locale: "en",
        messages: { en: defineMessages(messages) },
      }),
    },
    slots: { layout: content },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  return wrapper;
}

describe("<SkipNavigationButton>", () => {
  it("shows the translated default label", () => {
    const w = mountLayout(() => h(SkipNavigationButton), {
      "chelone.navigation.skip_nav": "Jump to the page",
    });
    expect(w.get("button").text()).toBe("Jump to the page");
  });

  it("falls back to 'Skip to content' when the key has no message", () => {
    const w = mountLayout(() => h(SkipNavigationButton));
    expect(w.get("button").text()).toBe("Skip to content");
  });

  it("shows a label without a dot as written", () => {
    const w = mountLayout(() =>
      h(SkipNavigationButton, { label: "Straight to the data" }),
    );
    expect(w.get("button").text()).toBe("Straight to the data");
  });

  it("renders its default slot as the label", () => {
    const w = mountLayout(() =>
      h(SkipNavigationButton, null, {
        default: () => h("em", "Over the menu"),
      }),
    );
    expect(w.get("button em").text()).toBe("Over the menu");
    expect(w.get("button").text()).toBe("Over the menu");
  });

  it("focuses the main-content element and leaves no tabindex on it", async () => {
    const w = mountLayout(() => [
      h(SkipNavigationButton),
      h("main", { id: "main-content" }, [
        h("button", { type: "button", id: "first" }, "First control"),
      ]),
    ]);
    const main = elementOf(
      document.getElementById("main-content"),
      HTMLElement,
    );
    const tabIndexWhileFocused: Array<string | null> = [];
    const focus = vi.spyOn(main, "focus").mockImplementation(() => {
      tabIndexWhileFocused.push(main.getAttribute("tabindex"));
    });
    const blur = vi.spyOn(main, "blur");

    await w.get("button").trigger("click");

    expect(tabIndexWhileFocused).toEqual(["-1"]);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(blur).toHaveBeenCalledTimes(1);
    expect(main.hasAttribute("tabindex")).toBe(false);
  });

  it("warns and does nothing when main-content is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = mountLayout(() => h(SkipNavigationButton));

    await w.get("button").trigger("click");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("main-content");
    expect(document.body.querySelector("[tabindex]")).toBeNull();
    warn.mockRestore();
  });

  it("merges a class onto the button", () => {
    const w = mountLayout(() =>
      h(SkipNavigationButton, { class: "custom-skip" }),
    );
    const button = w.get("button");
    expect(button.attributes("type")).toBe("button");
    expect(button.classes()).toContain("custom-skip");
    expect(button.classes()).toContain("fixed");
  });
});
