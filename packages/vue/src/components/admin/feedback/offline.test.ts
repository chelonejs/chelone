/**
 * `useIsOffline` and `<Offline>` — the browser-connectivity banner. Mounted
 * under a real `<Admin>`; asserted through roles and text. The hook follows
 * `navigator.onLine` and the offline/online events; the component renders
 * nothing online, a status banner (or its default slot) offline, and
 * translates the default message.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useIsOffline } from "../../../data/use-is-offline";
import Offline from "./offline.vue";

const mounted: Array<{ unmount: () => void }> = [];
let onLine = true;

// jsdom's `navigator.onLine` is a getter on the prototype, so a spy is enough.
beforeEach(() => {
  onLine = true;
  vi.spyOn(window.navigator, "onLine", "get").mockImplementation(() => onLine);
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

async function mountUnderAdmin(
  content: () => VNodeChild,
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
          { default: content, layout: () => h("div") },
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

async function goOffline() {
  onLine = false;
  window.dispatchEvent(new Event("offline"));
  await flushPromises();
}

async function goOnline() {
  onLine = true;
  window.dispatchEvent(new Event("online"));
  await flushPromises();
}

const IsOfflineProbe = defineComponent({
  setup() {
    const isOffline = useIsOffline();
    return () => h("p", isOffline.value ? "offline" : "online");
  },
});

const status = () => document.querySelector('[role="status"]');

describe("useIsOffline", () => {
  it("is false while navigator.onLine is true", async () => {
    await mountUnderAdmin(() => h(IsOfflineProbe));
    expect(document.body.textContent).toContain("online");
    expect(document.body.textContent).not.toContain("offline");
  });

  it("follows the offline and online events", async () => {
    await mountUnderAdmin(() => h(IsOfflineProbe));
    await goOffline();
    expect(document.body.textContent).toContain("offline");
    await goOnline();
    expect(document.body.textContent).not.toContain("offline");
  });
});

describe("<Offline>", () => {
  it("renders nothing while online", async () => {
    await mountUnderAdmin(() => h(Offline));
    expect(status()).toBeNull();
    expect(document.body.textContent).toBe("");
  });

  it("shows the default status banner when the page opens offline", async () => {
    onLine = false;
    await mountUnderAdmin(() => h(Offline));
    const banner = status();
    expect(banner?.textContent).toContain("You are offline");
    expect(banner?.getAttribute("aria-live")).toBe("polite");
  });

  it("shows its default slot instead of the banner when offline", async () => {
    onLine = false;
    await mountUnderAdmin(() =>
      h(
        Offline,
        { class: "custom" },
        { default: () => h("span", "Reconnecting soon") },
      ),
    );
    const slotted = [...document.querySelectorAll("span")].find(
      (el) => el.textContent === "Reconnecting soon",
    );
    expect(slotted).toBeTruthy();
    expect(status()).toBeNull();
    expect(slotted?.parentElement?.className).toBe("custom");
  });

  it("appears on the offline event and goes on the online event", async () => {
    await mountUnderAdmin(() => h(Offline));
    expect(status()).toBeNull();
    await goOffline();
    expect(status()).not.toBeNull();
    await goOnline();
    expect(status()).toBeNull();
  });

  it("translates the default message", async () => {
    onLine = false;
    await mountUnderAdmin(() => h(Offline), {
      "chelone.notification.offline": "Vous êtes hors ligne",
    });
    expect(status()?.textContent).toContain("Vous êtes hors ligne");
  });
});
