/**
 * `<ApplicationUpdatedNotification>` — the "new version available" card with a
 * reload button. Mounted under a real `<Admin>`; asserted through roles and
 * text. Covers the default message and button, the reload action (page reload
 * vs the `reload` event), the prop aliases, and translation of both labels.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import ApplicationUpdatedNotification from "./application-updated-notification.vue";

const mounted: Array<{ unmount: () => void }> = [];
const reload = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  reload.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, reload },
  });
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

async function mountNotification(
  props: Record<string, unknown> = {},
  messages: Record<string, string> = {},
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
              messages: { en: defineMessages(messages) },
            }),
          },
          {
            default: () => h(ApplicationUpdatedNotification, props),
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

const alert = () => document.querySelector('[role="alert"]');
const button = (name?: string) =>
  [...document.querySelectorAll("button")].find(
    (el) => name === undefined || el.textContent?.trim() === name,
  );

describe("<ApplicationUpdatedNotification>", () => {
  it("shows the default message and reload button", async () => {
    await mountNotification();
    expect(alert()?.textContent).toContain(
      "A new version of the application is available",
    );
    expect(button("Reload")).toBeTruthy();
  });

  it("reloads the page when the button is clicked", async () => {
    await mountNotification();
    button()?.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("emits reload instead of reloading when a listener is attached", async () => {
    const onReload = vi.fn();
    await mountNotification({ onReload });
    button()?.click();
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it("emits reload once when the listener is attached with .once", async () => {
    const onReloadOnce = vi.fn();
    await mountNotification({ onReloadOnce });
    button()?.click();
    expect(onReloadOnce).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it("takes notificationText and updateText as aliases", async () => {
    await mountNotification({
      notificationText: "New build out",
      updateText: "Refresh now",
    });
    expect(alert()?.textContent).toContain("New build out");
    expect(button("Refresh now")).toBeTruthy();
  });

  it("translates the message and the button label", async () => {
    await mountNotification(
      {},
      {
        "chelone.notification.application_update_available":
          "Une nouvelle version est disponible",
        "chelone.action.reload": "Recharger",
      },
    );
    expect(alert()?.textContent).toContain(
      "Une nouvelle version est disponible",
    );
    expect(button("Recharger")).toBeTruthy();
  });
});
