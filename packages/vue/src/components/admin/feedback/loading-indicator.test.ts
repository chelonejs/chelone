/**
 * `<LoadingIndicator>` — a refresh button with a spinner laid over it while
 * data is in flight. Mounted under a real `<Admin>`; asserted through roles,
 * attributes and the query client.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import LoadingIndicator from "./loading-indicator.vue";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountIndicator(
  props: Record<string, unknown> = {},
  messages: Record<string, string> = {},
) {
  const queryClient = new QueryClient();
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient,
            i18n: createI18n({
              locale: "en",
              messages: {
                en: defineMessages({
                  "chelone.action.refresh": "Refresh",
                  ...messages,
                }),
              },
            }),
          },
          {
            default: () => h(LoadingIndicator, props),
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

  /** Starts a query that stays in flight until the returned function runs. */
  const startQuery = async () => {
    let release: (value: unknown) => void = () => {};
    const gated = new Promise((resolve) => {
      release = resolve;
    });
    void queryClient.fetchQuery({ queryKey: ["gated"], queryFn: () => gated });
    await flushPromises();
    return release;
  };
  return { queryClient, startQuery };
}

const spinner = () => document.querySelector('[role="status"]');
const button = () =>
  elementOf(document.querySelector("button"), HTMLButtonElement);

describe("<LoadingIndicator>", () => {
  it("shows no spinner while idle", async () => {
    await mountIndicator();
    expect(spinner()).toBeNull();
    expect(button()?.getAttribute("aria-label")).toBe("Refresh");
    expect(button()?.classList.contains("opacity-0")).toBe(false);
  });

  it("shows a labelled spinner while a query is in flight", async () => {
    const { startQuery } = await mountIndicator();
    await startQuery();
    expect(spinner()?.getAttribute("aria-label")).toBe("Loading");
    expect(button()?.classList.contains("opacity-0")).toBe(true);
  });

  it("removes the spinner when the query settles", async () => {
    const { startQuery } = await mountIndicator();
    const release = await startQuery();
    expect(spinner()).not.toBeNull();
    release("done");
    await flushPromises();
    expect(spinner()).toBeNull();
  });

  it("takes the button out of the tab order and accessibility tree while loading", async () => {
    const { startQuery } = await mountIndicator();
    await startQuery();
    expect(button()?.getAttribute("tabindex")).toBe("-1");
    expect(button()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("refreshes the queries and emits click when the button is clicked", async () => {
    const onClick = vi.fn();
    const { queryClient } = await mountIndicator({ onClick });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    button()?.click();
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("translates the spinner label", async () => {
    const { startQuery } = await mountIndicator(
      {},
      { "chelone.page.loading": "Chargement" },
    );
    await startQuery();
    expect(spinner()?.getAttribute("aria-label")).toBe("Chargement");
  });
});
