/**
 * Tests: `<CheckForApplicationUpdate>` and `useCheckForApplicationUpdate` —
 * poll the deployed page and show a notice once its body changes.
 *
 * Asserts: nothing renders until the fetched body differs from the first one,
 * then the default or a slotted notification; the url, `cache: "no-store"`,
 * `disabled` and `interval` options; `onNewVersionAvailable` firing once; a
 * changed `url` ref rebuilding the poll; and that changing `fetchOptions`
 * never restarts it.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { useCheckForApplicationUpdate } from "../../../data/use-check-for-application-update";
import CheckForApplicationUpdate from "./check-for-application-update.vue";

const URL = "https://app.test/index.html";
const INTERVAL = 1000;

const mounted: Array<{ unmount: () => void }> = [];
let body: string;
const fetchMock =
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

/** Lets the fetch promise chain settle, then runs timers due within `ms`. */
async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
  body = "<html>build 1</html>";
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(body));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Mounts `content` as the default slot of a real `<Admin>`. */
async function mountUnderAdmin(content: () => ReturnType<typeof h>) {
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
              messages: { en: defineMessages({}) },
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
  await nextTick();
  return wrapper;
}

function mountCheck(
  props: Record<string, unknown> = {},
  slots?: Record<string, () => ReturnType<typeof h>>,
) {
  return mountUnderAdmin(() =>
    h(
      CheckForApplicationUpdate,
      { disabled: false, url: URL, interval: INTERVAL, ...props },
      slots,
    ),
  );
}

const alert = () => document.querySelector('[role="alert"]');

describe("<CheckForApplicationUpdate>", () => {
  it("renders nothing while the deployed page is unchanged", async () => {
    await mountCheck();
    await advance(INTERVAL * 3);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    expect(alert()).toBeNull();
  });

  it("renders the default notification when the body changes", async () => {
    await mountCheck();
    await advance(0);
    body = "<html>build 2</html>";
    await advance(INTERVAL);
    expect(alert()?.textContent).toContain(
      "A new version of the application is available",
    );
  });

  it("renders a notification slot", async () => {
    await mountCheck({}, { notification: () => h("p", "Fresh build out") });
    await advance(0);
    expect(document.body.textContent).not.toContain("Fresh build out");
    body = "<html>build 2</html>";
    await advance(INTERVAL);
    expect(document.body.textContent).toContain("Fresh build out");
    expect(alert()).toBeNull();
  });

  it("does not fetch while disabled", async () => {
    await mountCheck({ disabled: true });
    await advance(INTERVAL * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the url option with cache no-store", async () => {
    await mountCheck({
      fetchOptions: { headers: { "x-probe": "1" }, cache: "force-cache" },
    });
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = defined(fetchMock.mock.calls[0]);
    expect(calledUrl).toBe(URL);
    expect(init.cache).toBe("no-store");
    expect(init.headers).toEqual({ "x-probe": "1" });
  });

  it("polls again after the interval", async () => {
    await mountCheck();
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(INTERVAL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("calls onNewVersionAvailable once", async () => {
    const onNewVersionAvailable = vi.fn();
    await mountCheck({ onNewVersionAvailable });
    await advance(0);
    expect(onNewVersionAvailable).not.toHaveBeenCalled();
    body = "<html>build 2</html>";
    await advance(INTERVAL * 3);
    expect(onNewVersionAvailable).toHaveBeenCalledTimes(1);
  });

  it("rebuilds its poll when url changes", async () => {
    const url = ref(URL);
    await mountUnderAdmin(() =>
      h(CheckForApplicationUpdate, {
        disabled: false,
        url: url.value,
        interval: INTERVAL,
      }),
    );
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    url.value = "https://app.test/other.html";
    await nextTick();
    await advance(0);
    // A rebuilt poll fetches straight away, against the new url.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://app.test/other.html");
  });

  it("does not restart its poll when fetchOptions or the callback change", async () => {
    const tick = ref(1);
    await mountUnderAdmin(() =>
      h(CheckForApplicationUpdate, {
        disabled: false,
        url: URL,
        interval: INTERVAL,
        fetchOptions: { headers: { "x-tick": String(tick.value) } },
        onNewVersionAvailable: () => undefined,
      }),
    );
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    tick.value = 2;
    await nextTick();
    tick.value = 3;
    await nextTick();
    await advance(0);
    // A restarted poll would have fetched again straight away.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(INTERVAL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = defined(fetchMock.mock.calls[1]);
    expect(init.headers).toEqual({ "x-tick": "3" });
  });

  it("stops polling on unmount", async () => {
    const wrapper = await mountCheck();
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    mounted.splice(0);
    await advance(INTERVAL * 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("useCheckForApplicationUpdate", () => {
  it("returns true after a changed response", async () => {
    let result!: Readonly<Ref<boolean>>;
    await mountUnderAdmin(() =>
      h(
        defineComponent({
          setup() {
            result = useCheckForApplicationUpdate({
              disabled: false,
              url: URL,
              interval: INTERVAL,
            });
            return () => null;
          },
        }),
      ),
    );
    await advance(0);
    expect(result.value).toBe(false);
    body = "<html>build 2</html>";
    await advance(INTERVAL);
    expect(result.value).toBe(true);
  });
});
