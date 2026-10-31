/**
 * `<TopToolbar>` — the row of view actions to put in `<List>`'s `#actions` slot.
 */

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import TopToolbar from "./top-toolbar.vue";

describe("<TopToolbar>", () => {
  it("renders its default slot", () => {
    const wrapper = mount(TopToolbar, {
      slots: {
        default: () => [
          h("button", { type: "button" }, "Create"),
          h("button", { type: "button" }, "Export"),
        ],
      },
    });
    const buttons = wrapper.findAll("button").map((b) => b.text());
    expect(buttons).toEqual(["Create", "Export"]);
  });

  it("merges class and passes attributes to the div", () => {
    const wrapper = mount(TopToolbar, {
      props: { class: "custom-class" },
      attrs: { "data-testid": "toolbar", id: "actions" },
      slots: { default: () => h("span", "child") },
    });
    const toolbar = wrapper.get("[data-testid=toolbar]").element;
    expect(toolbar.tagName).toBe("DIV");
    expect(toolbar.id).toBe("actions");
    expect(toolbar.className).toContain("custom-class");
    expect(toolbar.className).toContain("justify-end");
  });
});
