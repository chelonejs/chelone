/**
 * V3-c Task 2 gate probes for the feedback surface: `<Confirm>` opens on
 * `isOpen`, emits `confirm`/`close` from its buttons + overlay; `<Notification>`
 * surfaces + translates a queued notification-store message and drains the
 * store; `<Loading>`/`<Spinner>`/`<LinearProgress>`/`<Ready>`/`<Error>` render.
 * Mounted under a minimal `provideCheloneContext` harness (no router needed —
 * these are presentational). The Confirm-into-delete wiring is exercised by the
 * V3-b button specs (updated to click the dialog).
 */

import {
  type AnyCheloneI18n,
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { provideCheloneContext } from "../../context";
import Confirm from "./feedback/confirm.vue";
// Imported as `ErrorPage` — a local `Error` binding would shadow the global.
import ErrorPage from "./feedback/error.vue";
import LinearProgress from "./feedback/linear-progress.vue";
import Loading from "./feedback/loading.vue";
import Notification from "./feedback/notification.vue";
import Ready from "./feedback/ready.vue";
import Spinner from "./feedback/spinner.vue";

const tick = () => new Promise((r) => setTimeout(r, 0));

interface HarnessOptions {
  notifications?: NotificationStore;
  i18n?: AnyCheloneI18n;
}

/** Mount `render` under a minimal Chelone context (no `<Admin>`/router). */
function mountFeedback(render: () => VNodeChild, options: HarnessOptions = {}) {
  const dataProvider = fakeDataProvider({});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider,
        queryClient,
        notifications: options.notifications,
        i18n: options.i18n,
      });
      return () => render();
    },
  });
  return mount(Harness);
}

describe("<Confirm>", () => {
  it("renders nothing while closed", () => {
    const wrapper = mountFeedback(() =>
      h(Confirm, { isOpen: false, title: "Delete?" }),
    );
    expect(wrapper.find('[data-slot="confirm"]').exists()).toBe(false);
  });

  it("renders the title + content when open", () => {
    const wrapper = mountFeedback(() =>
      h(Confirm, {
        isOpen: true,
        title: "Are you sure?",
        content: "This cannot be undone.",
      }),
    );
    expect(wrapper.find('[data-slot="confirm-title"]').text()).toBe(
      "Are you sure?",
    );
    expect(wrapper.find('[data-slot="confirm-content"]').text()).toBe(
      "This cannot be undone.",
    );
  });

  it("emits `confirm` when the accept button is clicked", async () => {
    let confirmed = 0;
    const wrapper = mountFeedback(() =>
      h(Confirm, {
        isOpen: true,
        title: "Delete?",
        onConfirm: () => {
          confirmed += 1;
        },
      }),
    );
    await wrapper.find('[data-slot="confirm-accept"]').trigger("click");
    expect(confirmed).toBe(1);
  });

  it("emits `close` when the cancel button or overlay is clicked", async () => {
    let closed = 0;
    const wrapper = mountFeedback(() =>
      h(Confirm, {
        isOpen: true,
        title: "Delete?",
        onClose: () => {
          closed += 1;
        },
      }),
    );
    await wrapper.find('[data-slot="confirm-cancel"]').trigger("click");
    await wrapper.find('[data-slot="confirm-overlay"]').trigger("click");
    expect(closed).toBe(2);
  });

  it("translates the title/content through the ambient i18n", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: defineMessages({ "my.key": "Localized" }) },
    });
    const wrapper = mountFeedback(
      () => h(Confirm, { isOpen: true, title: "my.key" }),
      { i18n },
    );
    expect(wrapper.find('[data-slot="confirm-title"]').text()).toBe(
      "Localized",
    );
  });
});

describe("<Notification>", () => {
  it("surfaces a queued message as a toast and drains the store", async () => {
    const notifications = createNotificationStore();
    notifications.notify("posts.approved", { type: "success" });
    const wrapper = mountFeedback(() => h(Notification), { notifications });
    await flushPromises();
    const toast = wrapper.find('[data-slot="notification-toast"]');
    expect(toast.exists()).toBe(true);
    expect(toast.text()).toContain("posts.approved");
    expect(toast.attributes("data-type")).toBe("success");
    // Store drained — the toast owns its lifecycle now.
    expect(notifications.getSnapshot()).toEqual([]);
  });

  it("surfaces a message pushed after mount", async () => {
    const notifications = createNotificationStore();
    const wrapper = mountFeedback(() => h(Notification), { notifications });
    notifications.notify("saved", { type: "info" });
    await flushPromises();
    expect(wrapper.find('[data-slot="notification-toast"]').text()).toContain(
      "saved",
    );
  });

  it("dismisses a toast when its close button is clicked", async () => {
    const notifications = createNotificationStore();
    notifications.notify("hello", { type: "info" });
    const wrapper = mountFeedback(() => h(Notification, { duration: 0 }), {
      notifications,
    });
    await flushPromises();
    await wrapper.find('[data-slot="notification-close"]').trigger("click");
    expect(wrapper.find('[data-slot="notification-toast"]').exists()).toBe(
      false,
    );
  });
});

describe("presentational feedback", () => {
  it("<Loading> renders after its delay", async () => {
    const wrapper = mountFeedback(() => h(Loading, { delay: 0 }));
    await tick();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    // No i18n in this harness → translate echoes the key (the `_` fallback IS
    // the key), so the deferred loading messages render as their keys.
    expect(wrapper.text()).toContain("chelone.page.loading");
  });

  it("<Spinner> renders and honors the `show` gate", () => {
    const shown = mountFeedback(() => h(Spinner));
    expect(shown.find('[data-slot="spinner"]').exists()).toBe(true);
    const hidden = mountFeedback(() => h(Spinner, { show: false }));
    expect(hidden.find('[data-slot="spinner"]').exists()).toBe(false);
  });

  it("<LinearProgress> renders a determinate bar", async () => {
    const wrapper = mountFeedback(() =>
      h(LinearProgress, { timeout: 0, value: 50, max: 100 }),
    );
    await tick();
    const bar = wrapper.find(".bg-primary");
    expect(bar.exists()).toBe(true);
    expect(bar.attributes("style")).toContain("width: 50%");
  });

  it("<Ready> renders the welcome splash", () => {
    const wrapper = mountFeedback(() => h(Ready));
    expect(wrapper.text()).toContain("Welcome to Chelone");
  });

  it("<Ready> links GitHub to chelonejs/chelone", () => {
    const wrapper = mountFeedback(() => h(Ready));
    const github = wrapper
      .findAll("a")
      .find((link) => /GitHub/i.test(link.text()));
    expect(github?.attributes("href")).toBe(
      "https://github.com/chelonejs/chelone",
    );
  });

  it("<Error> renders the heading + error message", () => {
    const wrapper = mountFeedback(() =>
      h(ErrorPage, { error: new globalThis.Error("boom") }),
    );
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Something Went Wrong");
    expect(wrapper.text()).toContain("boom");
  });
});
