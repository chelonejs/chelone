/**
 * `<IconButtonWithTooltip>` — a ghost icon button named and titled by its
 * translated label. Mounted under a real `<Admin>`; asserted through roles
 * and attributes.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import IconButtonWithTooltip from "./icon-button-with-tooltip.vue";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountButton(
  props: Record<string, unknown>,
  slots: Record<string, () => unknown> = {},
) {
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
            i18n: createI18n({
              locale: "en",
              messages: {
                en: defineMessages({
                  "chelone.action.refresh": "Refresh data",
                }),
              },
            }),
          },
          {
            default: () =>
              h(IconButtonWithTooltip, props, {
                default: () => h("svg", { "aria-hidden": "true" }),
                ...slots,
              }),
            layout: () => h("div"),
          },
        );
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await router.isReady();
  await flushPromises();
}

const button = () =>
  elementOf(document.querySelector("button"), HTMLButtonElement);

describe("<IconButtonWithTooltip>", () => {
  it("names the button by its translated label", async () => {
    await mountButton({ label: "chelone.action.refresh" });
    expect(button()?.getAttribute("aria-label")).toBe("Refresh data");
  });

  it("shows a label that is not a key as written", async () => {
    await mountButton({ label: "Plain words" });
    expect(button()?.getAttribute("aria-label")).toBe("Plain words");
  });

  it("sets title to the translated label", async () => {
    await mountButton({ label: "chelone.action.refresh" });
    expect(button()?.getAttribute("title")).toBe("Refresh data");
  });

  it("sets no aria-label for a label slot", async () => {
    await mountButton({}, { label: () => h("span", "Slot label") });
    expect(button()?.hasAttribute("aria-label")).toBe(false);
    expect(button()?.hasAttribute("title")).toBe(false);
  });

  it("emits click and stays inert when disabled", async () => {
    const onClick = vi.fn();
    await mountButton({ label: "Plain words", onClick });
    button()?.click();
    expect(onClick).toHaveBeenCalledTimes(1);

    const onDisabledClick = vi.fn();
    await mountButton({
      label: "Disabled",
      onClick: onDisabledClick,
      disabled: true,
    });
    const disabled = [...document.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Disabled",
    );
    expect(disabled?.disabled).toBe(true);
    disabled?.click();
    expect(onDisabledClick).not.toHaveBeenCalled();
  });
});
