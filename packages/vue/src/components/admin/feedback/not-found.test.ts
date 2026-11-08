/**
 * `<NotFound>` tests: the page for an unknown URL, the Vue twin of
 * `@chelone/react`'s `feedback/not-found.tsx`.
 *
 * Asserts: the heading, message and back button render; the text is
 * translated; the loading state shows while the auth check is pending; the
 * back button goes back one history entry through the router adapter; mounted
 * as `<Admin>`'s `#catchAll` slot it shows for an unknown path; the `#icon`
 * slot replaces the default glyph.
 */

import {
  type AuthProvider,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../../admin/admin.vue";
import TitlePortal from "../layout/title-portal.vue";
import NotFound from "./not-found.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const Blank = defineComponent({ setup: () => () => h("div") });

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Blank },
      { path: "/a", component: Blank },
      { path: "/b", component: Blank },
    ],
  });
}

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

/** Mount `render()` in `<Admin>`'s default slot, attached so a Teleport resolves. */
function mountInAdmin(
  render: () => unknown,
  opts: {
    authProvider?: AuthProvider;
    messages?: Record<string, string>;
    router?: Router;
  } = {},
) {
  const router = opts.router ?? makeRouter();
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient({
                defaultOptions: { queries: { retry: false } },
              }),
              i18n: createI18n({
                locale: "en",
                messages: { en: defineMessages(opts.messages ?? {}) },
              }),
              authProvider: opts.authProvider,
            },
            { default: render },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  return { wrapper, router };
}

describe("<NotFound>", () => {
  it("shows the heading, message and back button", async () => {
    const { wrapper } = mountInAdmin(() => h(NotFound));
    await flushPromises();

    expect(wrapper.get("h1").text()).toBe("Not Found");
    expect(wrapper.text()).toContain("The page you requested cannot be found.");
    const back = wrapper.get("button");
    expect(back.text()).toBe("Back");
    expect(back.attributes("type")).toBe("button");
  });

  it("translates its text", async () => {
    const { wrapper } = mountInAdmin(() => h(NotFound), {
      messages: {
        "chelone.page.not_found": "Introuvable",
        "chelone.message.not_found": "Cette page n'existe pas",
        "chelone.action.back": "Retour",
      },
    });
    await flushPromises();

    expect(wrapper.get("h1").text()).toBe("Introuvable");
    expect(wrapper.text()).toContain("Cette page n'existe pas");
    expect(wrapper.get("button").text()).toBe("Retour");
  });

  it("shows the loading state while the auth check is pending", async () => {
    vi.useFakeTimers();
    const { wrapper } = mountInAdmin(() => h(NotFound), {
      authProvider: makeAuthProvider({
        checkAuth: () => new Promise<void>(() => {}),
      }),
    });
    await vi.advanceTimersByTimeAsync(1000);

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Back");
  });

  it("logs a signed-out visitor out so the shell sends them to login", async () => {
    const logout = vi.fn(async () => {});
    mountInAdmin(() => h(NotFound), {
      authProvider: makeAuthProvider({
        checkAuth: async () => {
          throw new Error("signed out");
        },
        logout,
      }),
    });
    await flushPromises();

    expect(logout).toHaveBeenCalled();
  });

  it("goes back one entry when the button is clicked", async () => {
    const router = makeRouter();
    const { wrapper } = mountInAdmin(() => h(NotFound), { router });
    await router.push("/a");
    await router.push("/b");
    await flushPromises();

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/a");
  });

  it("puts the translated page name in the title portal", async () => {
    const { wrapper } = mountInAdmin(() => [h(TitlePortal), h(NotFound)]);
    await flushPromises();

    const headings = wrapper.findAll("h1").map((heading) => heading.text());
    expect(headings).toEqual(["Not Found", "Not Found"]);
  });

  it("overrides the portal title with the title prop", async () => {
    const { wrapper } = mountInAdmin(() => [
      h(TitlePortal),
      h(NotFound, { title: "Lost" }),
    ]);
    await flushPromises();

    const headings = wrapper.findAll("h1").map((heading) => heading.text());
    expect(headings).toEqual(["Lost", "Not Found"]);
  });

  it("passes class and attributes through to the wrapper", async () => {
    const { wrapper } = mountInAdmin(() =>
      h(NotFound, { class: "custom", "data-testid": "nf" }),
    );
    await flushPromises();

    const root = wrapper.get("[data-testid=nf]");
    expect(root.classes()).toContain("custom");
  });

  it("replaces the default icon with the icon slot", async () => {
    const { wrapper } = mountInAdmin(() =>
      h(NotFound, null, {
        icon: () => h("span", { "data-testid": "custom-icon" }, "?"),
      }),
    );
    await flushPromises();

    expect(wrapper.find("[data-testid=custom-icon]").exists()).toBe(true);
    expect(wrapper.find("h1 svg").exists()).toBe(false);
  });

  describe("as the catchAll slot", () => {
    it("shows for an unknown path", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: Blank }],
      });
      await router.push("/nowhere");
      const wrapper = mount(Admin, {
        props: {
          dataProvider: fakeDataProvider({}),
          queryClient: new QueryClient(),
        },
        slots: { catchAll: () => h(NotFound) },
        global: { plugins: [router] },
      });
      await flushPromises();

      expect(wrapper.get("h1").text()).toBe("Not Found");
    });
  });
});
